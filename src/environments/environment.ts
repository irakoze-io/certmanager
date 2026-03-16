export const environment = {
  production: false,
  // In development we use same-origin (relative) URLs.
  // `ng serve` uses `proxy.conf.json` to forward /api and /auth to the backend.
  apiUrl: 'http://localhost:8080',
  apiBasePath: '/api',
  authBasePath: '/auth'
};
