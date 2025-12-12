export const environment = {
  production: true,
  // Same-origin (relative) URLs so HTTPS pages don't get blocked by mixed-content when the upstream is HTTP.
  // The SSR/Node server proxies /api and /auth to the upstream backend.
  apiUrl: '34.31.118.246:8080',
  apiBasePath: '/api',
  authBasePath: '/auth'
};
