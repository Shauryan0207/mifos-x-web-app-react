/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { envConfig } from './env-config'

const TOKEN_KEY = 'mifosToken'
/**
 * Access token from the OIDC flow. Stored alongside mifosToken in
 * localStorage so the session survives a reload, matching how oidc-client-ts
 * persists the User object.
 */
const OIDC_TOKEN_KEY = 'mifosOidcAccessToken'

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const getOidcToken = (): string | null => {
  return localStorage.getItem(OIDC_TOKEN_KEY)
}

export const setOidcToken = (token: string): void => {
  localStorage.setItem(OIDC_TOKEN_KEY, token)
}

export const clearOidcToken = (): void => {
  localStorage.removeItem(OIDC_TOKEN_KEY)
}

/** True when either sign-in flow has produced a credential for Fineract. */
export const hasSession = (): boolean => {
  return !!(getOidcToken() || getAuthToken())
}

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Fineract-Platform-TenantId': envConfig.tenantId,
  }

  // An OIDC session wins over a stale Basic token, so requests are never
  // made under a previous user's Fineract identity.
  const oidcToken = getOidcToken()
  if (oidcToken) {
    headers.Authorization = `Bearer ${oidcToken}`
    return headers
  }

  const token = getAuthToken()
  if (token) {
    headers.Authorization = `Basic ${token}`
  }

  return headers
}

export const getDefaultHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export const getAllHeaders = (): Record<string, string> => {
  return {
    ...getDefaultHeaders(),
    ...getAuthHeaders(),
  }
}

export const getApiBaseUrl = (): string => {
  const url = envConfig.apiUrl
  const provider = envConfig.apiProvider
  const version = envConfig.apiVersion

  // When apiUrl is empty, build a relative URL so the request goes
  // through the same origin (nginx reverse-proxy → local Fineract)
  const base = url ? url.replace(/\/$/, '') : ''
  return `${base}${provider}${version}`
}
