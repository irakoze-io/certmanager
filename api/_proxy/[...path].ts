import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

type NodeReq = any;
type NodeRes = any;

export default function handler(req: NodeReq, res: NodeRes): void {
  const upstreamBaseUrl = process.env.UPSTREAM_API_URL ?? 'http://34.31.118.246:8080';
  const upstream = new URL(upstreamBaseUrl);
  const forward = upstream.protocol === 'https:' ? httpsRequest : httpRequest;

  // `vercel.json` rewrites:
  // - /api/*  -> /api/_proxy/api/*
  // - /auth/* -> /api/_proxy/auth/*
  const url = new URL(req.url ?? '/', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  // Expected: ["api", "_proxy", "<prefix>", ...rest]
  const prefix = parts[2];
  const rest = parts.slice(3);

  if (prefix !== 'api' && prefix !== 'auth') {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Invalid proxy prefix' }));
    return;
  }

  const upstreamPath = `/${prefix}/${rest.join('/')}${url.search}`;

  const headers: Record<string, any> = { ...req.headers };
  headers.host = upstream.host;
  headers['x-forwarded-host'] = req.headers?.host;
  headers['x-forwarded-proto'] = req.headers?.['x-forwarded-proto'] ?? 'https';

  const proxyReq = forward(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: upstreamPath,
      headers,
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode ?? 502;

      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, value as any);
        }
      }

      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    console.error(`Vercel API proxy error (upstream=${upstreamBaseUrl}, path=${upstreamPath}):`, err);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Upstream API unreachable' }));
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq);
}


