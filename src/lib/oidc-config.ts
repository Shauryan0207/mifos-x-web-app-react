/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { WebStorageStateStore } from 'oidc-client-ts'
import type { AuthProviderProps } from 'react-oidc-context'

import { envConfig } from '@/lib/env-config'

/** Scopes requested from the provider; offline_access yields a refresh token. */
const OIDC_SCOPE = 'openid profile email offline_access'

/**
 * Base URL the provider redirects back to. Falls back to the current origin
 * when no explicit frontend URL is configured.
 */
const getFrontendUrl = () =>
  (envConfig.oidcFrontendUrl || window.location.origin).replace(/\/$/, '')

/** Loopback hosts where cleartext http is acceptable for local development. */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/**
 * Cleartext endpoints would expose the authorization response and token
 * traffic, so http is permitted only against loopback. Mirrors the Angular
 * client's requireHttps.
 */
const isSecureUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname)
  } catch {
    return false
  }
}

/**
 * Whether OIDC is enabled and configured safely enough to mount the provider.
 * Falls back to the Basic auth flow when it is not, rather than starting a
 * flow that cannot complete.
 */
export const isOidcUsable = (): boolean => {
  if (!envConfig.oidcEnabled) return false

  if (!envConfig.oidcBaseUrl || !envConfig.oidcClientId) {
    console.error(
      'OIDC is enabled but oidcBaseUrl or oidcClientId is missing; falling back to password sign-in.'
    )
    return false
  }

  const redirectUri = `${getFrontendUrl()}/callback`
  if (!isSecureUrl(envConfig.oidcBaseUrl) || !isSecureUrl(redirectUri)) {
    console.error(
      'OIDC requires https outside local development; falling back to password sign-in.'
    )
    return false
  }

  return true
}

/**
 * Builds the OIDC client configuration from the runtime environment.
 * Mirrors the Angular web app's getOIDCConfig().
 */
export const getOidcConfig = (): AuthProviderProps => {
  const frontendUrl = getFrontendUrl()

  return {
    authority: envConfig.oidcBaseUrl,
    client_id: envConfig.oidcClientId,
    redirect_uri: `${frontendUrl}/callback`,
    post_logout_redirect_uri: `${frontendUrl}/login`,
    response_type: 'code',
    scope: OIDC_SCOPE,
    // The Angular client also leaves silent refresh off; renewal is handled
    // on 401 instead.
    automaticSilentRenew: false,
    // Persist the session across reloads, matching how the Basic-auth token
    // is stored today.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    // Strip the authorization code from the URL once the exchange completes.
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname)
    },
  }
}
