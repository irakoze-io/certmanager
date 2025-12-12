import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Proxy /api and /auth to the upstream backend (HTTP).
 *
 * Why: when the app is served over HTTPS, browsers block XHR/fetch calls to insecure HTTP origins.
 * By keeping the browser requests same-origin (/api, /auth) and proxying server-side, we avoid mixed-content.
 */
const upstreamBaseUrl = process.env['UPSTREAM_API_URL'] ?? 'http://34.31.118.246:8080';
const upstream = new URL(upstreamBaseUrl);

app.use(['/api', '/auth'], (req, res) => {
  const forward = upstream.protocol === 'https:' ? httpsRequest : httpRequest;

  const headers: Record<string, string | string[] | undefined> = { ...req.headers };

  // Ensure upstream sees the correct host and forwarding metadata.
  headers['host'] = upstream.host;
  headers['x-forwarded-host'] = req.headers.host;
  headers['x-forwarded-proto'] = req.protocol;
  headers['x-forwarded-for'] =
    typeof req.headers['x-forwarded-for'] === 'string' && req.headers['x-forwarded-for'].length > 0
      ? `${req.headers['x-forwarded-for']},${req.socket.remoteAddress ?? ''}`
      : req.socket.remoteAddress;

  const proxyReq = forward(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.originalUrl, // includes query string
      headers,
    },
    (proxyRes) => {
      if (proxyRes.statusCode) {
        res.status(proxyRes.statusCode);
      }

      // Copy upstream headers through.
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, value as string | string[]);
        }
      }

      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on('error', (err) => {
    console.error(`API proxy error (upstream=${upstreamBaseUrl}):`, err);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Upstream API unreachable' });
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq, { end: true });
});

/**
 * Serve static files from /browser
 */
const isDevelopment = process.env['NODE_ENV'] !== 'production';
app.use(
  express.static(browserDistFolder, {
    maxAge: isDevelopment ? '0' : '1y', // Disable caching in development
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 * For protected routes, we skip SSR and serve index.html directly to let Angular handle auth client-side
 */
app.use((req, res, next) => {
  // Skip if it's an API route, auth route, or a file request (has extension)
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/') || req.path.match(/\.[^/]+$/)) {
    return next(); // Let Express return 404 for these
  }

  // List of protected routes that should always be handled client-side
  const protectedRoutes = ['/dashboard', '/templates', '/certificates', '/verification'];
  const isProtectedRoute = protectedRoutes.some(route => req.path.startsWith(route));

  // Skip SSR for protected routes - always serve index.html for client-side routing
  // This ensures auth guard runs client-side and shows error notifications properly
  if (isProtectedRoute) {
    serveIndexHtml(req, res);
    return;
  }

  // For other routes (like /login), try SSR first
  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        // SSR didn't handle it - serve index.html for client-side routing
        serveIndexHtml(req, res);
      }
    })
    .catch((error) => {
      // SSR failed - serve index.html for client-side routing
      console.warn('SSR rendering failed, falling back to index.html:', error.message);
      serveIndexHtml(req, res);
    });
});

/**
 * Helper function to serve index.html for SPA fallback
 * This ensures that direct navigation to routes works even if SSR fails
 */
function serveIndexHtml(req: express.Request, res: express.Response): void {
  // Check if response has already been sent
  if (res.headersSent) {
    return;
  }

  // Serve index.html for all routes (SPA fallback)
  const indexHtml = join(browserDistFolder, 'index.html');

  // Use sendFile with error handling
  res.sendFile(indexHtml, (err) => {
    if (err) {
      console.error('Failed to serve index.html:', err);
      if (!res.headersSent) {
        if (isDevelopment) {
          console.warn('index.html not found in development - redirecting to /login');
          res.redirect('/login');
        } else {
          // In production, try to serve a minimal HTML that redirects
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>Loading...</title>
                <script>
                  window.location.href = '/login';
                </script>
              </head>
              <body>
                <p>Redirecting to login...</p>
              </body>
            </html>
          `);
        }
      }
    }
  });
}

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
