import axios from 'axios';

/*
  Axios client. The frontend talks ONLY to the Node backend (proxied at /api).

  Auth model:
    - Access token is short-lived, held in memory + localStorage, sent as a
      Bearer header.
    - Refresh token is an httpOnly cookie (set by the backend). On a 401 we call
      /auth/refresh once to mint a new access token and retry the request.
*/

const ACCESS_KEY = 'pp_access_token';

let accessToken = localStorage.getItem(ACCESS_KEY) || null;

export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Refresh-on-401 with single-flight so concurrent 401s share one refresh ---
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthRoute = original?.url?.includes('/auth/');
    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          api.post('/auth/refresh').finally(() => {
            refreshing = null;
          });
        const { data } = await refreshing;
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

/** Normalizes an axios error into a human-readable message. */
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}
