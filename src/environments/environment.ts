export const environment = {
  production: false,
  // Use empty string for relative URLs so Angular proxy handles the requests
  // The proxy.conf.json will forward /api and /auth to https://attach-commodities-anderson-declined.trycloudflare.com
  apiUrl: 'https://attach-commodities-anderson-declined.trycloudflare.com',
  apiBasePath: '/api',
  authBasePath: '/auth'
};
