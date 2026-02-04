/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import axios from 'axios'
import {
  getApiBaseUrl,
  getAuthHeaders,
  getDefaultHeaders,
} from '@/lib/http-client'

const fineract = axios.create({
  baseURL: getApiBaseUrl(),
  headers: getDefaultHeaders(),
  withCredentials: true,
})

fineract.interceptors.request.use(config => {
  const authHeaders = getAuthHeaders()
  Object.assign(config.headers, authHeaders)
  return config
})

export default fineract
