export const environment = {
  production: false,
  // Use same-origin (relative) URLs so the browser never calls the HTTP backend directly.
  // In dev, `proxy.conf.json` forwards /api and /auth to the backend.
  // In prod SSR, `src/server.ts` proxies /api and /auth to the backend.
  apiUrl: '34.31.118.246:8080',
  apiBasePath: '/api',
  authBasePath: '/auth'
};
