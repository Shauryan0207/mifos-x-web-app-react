/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ErrorResponse } from 'oidc-client-ts'
import type { User } from 'oidc-client-ts'

import { clearOidcToken, getOidcToken, setOidcToken } from '@/lib/http-client'
import { getOidcUserManager } from '@/lib/oidc-config'

/**
 * Whether a validated OIDC session exists.
 *
 * The callback route deliberately withholds the access token from storage
 * until Fineract has accepted it, so that an unvalidated token can never
 * survive into a reload. The userLoaded subscription below has to respect
 * that: it refreshes a session that is already established, and stays out of
 * the way while one is still being established.
 *
 * Seeded from storage so a reload mid-session is recognised as established.
 */
let sessionEstablished = getOidcToken() !== null

/** Called by the callback route once Fineract has accepted the token. */
export const markOidcSessionEstablished = (): void => {
  sessionEstablished = true
}

/**
 * Whether there is a session to renew at all.
 *
 * Guards the 401 handler as well as the subscription below. The token the
 * callback route sends to /userdetails is a bearer credential that Fineract
 * has not accepted yet, so a 401 there means the sign-in was rejected, not
 * that a session lapsed — renewing in response would store exactly the token
 * the validation just refused.
 */
export const isOidcSessionEstablished = (): boolean => sessionEstablished

/**
 * Forgets the session locally.
 *
 * Clearing the mirrored token is not enough: oidc-client-ts keeps its own
 * copy, including the refresh token, and a full page navigation would rebuild
 * the provider from it. Signing out at the provider is separate again, and
 * belongs to the sign-out flow rather than to a failed renewal.
 */
export const endOidcSession = async (): Promise<void> => {
  sessionEstablished = false
  clearOidcToken()

  try {
    await getOidcUserManager()?.removeUser()
  } catch (error) {
    console.error('Could not clear the stored OIDC user', error)
  }
}

let subscribed = false

/**
 * Mirrors renewed tokens into the store that getAuthHeaders() reads.
 *
 * oidc-client-ts renews on its own schedule and writes only to its own store,
 * so without this the app would keep sending the superseded token until it
 * expired.
 */
const subscribeToRenewals = (): void => {
  const manager = getOidcUserManager()
  if (!manager || subscribed) return

  subscribed = true

  manager.events.addUserLoaded(user => {
    if (!sessionEstablished) return
    if (!user.access_token) return
    setOidcToken(user.access_token, user.expires_at)
  })

  manager.events.addSilentRenewError(error => {
    // Not fatal on its own: the token is still valid until it expires, and a
    // request that outlives it recovers through the 401 handler in lib/axios.
    console.error('OIDC silent renewal failed', error)
  })
}

subscribeToRenewals()

/**
 * Why a renewal did not produce a usable token.
 *
 * The distinction decides whether the user keeps their session: a provider
 * that is briefly unreachable must not sign anyone out, while a credential
 * the provider has actually rejected cannot be recovered from.
 */
export type RenewalOutcome =
  | { status: 'renewed'; token: string }
  | { status: 'invalid' }
  | { status: 'unavailable' }

/**
 * OAuth error codes that mean the credential itself is finished — revoked,
 * already consumed, or requiring the user to interact with the provider
 * again. Anything else is treated as a transient failure.
 */
const FATAL_OAUTH_ERRORS = new Set([
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'login_required',
  'interaction_required',
  'consent_required',
  'account_selection_required',
])

const isFatal = (error: unknown): boolean => {
  return (
    error instanceof ErrorResponse &&
    !!error.error &&
    FATAL_OAUTH_ERRORS.has(error.error)
  )
}

/** Stores a renewed user and returns its access token. */
const adopt = (user: User): string => {
  setOidcToken(user.access_token, user.expires_at)
  return user.access_token
}

/**
 * A usable token that is not the one which just failed.
 *
 * automaticSilentRenew drives signinSilent() from its own timer, so a renewal
 * can already have happened — or be happening — outside this module. Checking
 * the store first keeps a request that failed on a superseded token from
 * spending a second refresh token to learn the same thing, which under
 * refresh-token rotation is what invalidates the other path's renewal.
 */
const tokenNewerThan = async (staleToken: string): Promise<string | null> => {
  const manager = getOidcUserManager()
  if (!manager) return null

  try {
    const user = await manager.getUser()
    if (!user?.access_token || user.expired) return null
    if (user.access_token === staleToken) return null

    return adopt(user)
  } catch {
    return null
  }
}

const requestRenewal = async (staleToken: string): Promise<RenewalOutcome> => {
  const manager = getOidcUserManager()
  if (!manager) return { status: 'unavailable' }

  try {
    // Renewal needs the refresh token from the offline_access scope. Without
    // one, signinSilent falls back to a hidden iframe, which needs the
    // provider to allow framing and third-party cookies; checking first turns
    // that unreliable round trip into an immediate, explicable failure.
    const current = await manager.getUser()
    if (!current?.refresh_token) {
      console.error(
        'Cannot renew the OIDC session: no refresh token. Check that the client grants the offline_access scope.'
      )
      return { status: 'invalid' }
    }

    const user = await manager.signinSilent()
    if (!user?.access_token) return { status: 'unavailable' }

    return { status: 'renewed', token: adopt(user) }
  } catch (error) {
    // A renewal racing the automaticSilentRenew timer can lose the refresh
    // token to it and fail with invalid_grant even though the session is
    // healthy. Re-read the store before concluding anything from the error.
    const renewedElsewhere = await tokenNewerThan(staleToken)
    if (renewedElsewhere) {
      return { status: 'renewed', token: renewedElsewhere }
    }

    if (isFatal(error)) {
      console.error('OIDC session can no longer be renewed', error)
      return { status: 'invalid' }
    }

    console.error('OIDC session renewal is temporarily unavailable', error)
    return { status: 'unavailable' }
  }
}

/**
 * In-flight renewal, shared so that a burst of concurrent 401s produces one
 * request to the provider rather than one per failed call.
 */
let renewal: Promise<RenewalOutcome> | null = null

/**
 * Renews the access token that `staleToken` superseded.
 *
 * Returns the replacement, or says whether the session is beyond recovery or
 * merely unreachable for the moment.
 */
export const renewOidcSession = async (
  staleToken: string
): Promise<RenewalOutcome> => {
  const alreadyRenewed = await tokenNewerThan(staleToken)
  if (alreadyRenewed) return { status: 'renewed', token: alreadyRenewed }

  if (renewal) return renewal

  renewal = requestRenewal(staleToken).finally(() => {
    renewal = null
  })

  return renewal
}
