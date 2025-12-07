export const environment = {
  production: false,
  // Use empty string for relative URLs so Angular proxy handles the requests
  // The proxy.conf.json will forward /api and /auth to http://localhost:8080
  apiUrl: '',
  apiBasePath: '/api',
  authBasePath: '/auth'
};
