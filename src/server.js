const fs = require('fs');
const http = require('http');
const https = require('https');
const next = require('next');

// Configuration via env with sensible defaults
const HOST = process.env.HOST || '0.0.0.0';
const PORT_HTTP = Number(process.env.PORT_HTTP || 80);
const PORT_HTTPS = Number(process.env.PORT_HTTPS || 443);

// Default Let's Encrypt paths (can be overridden via env)
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/pv32.northeurope.cloudapp.azure.com/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/pv32.northeurope.cloudapp.azure.com/fullchain.pem';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, hostname: HOST, port: PORT_HTTPS });
const handle = app.getRequestHandler();

function startServers(credentials) {
  // HTTP server: redirect everything to HTTPS
  const httpServer = http.createServer((req, res) => {
    const host = req.headers['host'] || '';
    // Ensure host doesn't include old port, and set to https port if non-standard
    const hostWithoutPort = host.split(':')[0];
    const location = `https://${hostWithoutPort}${req.url || '/'}`;
    res.statusCode = 301;
    res.setHeader('Location', location);
    res.end();
  });

  httpServer.listen(PORT_HTTP, HOST, () => {
    console.log(`[HTTP ] Listening on http://${HOST}:${PORT_HTTP} -> redirecting to HTTPS`);
  });

  // HTTPS server: serve Next.js
  const httpsServer = https.createServer(credentials, (req, res) => {
    handle(req, res);
  });

  httpsServer.listen(PORT_HTTPS, HOST, () => {
    console.log(`[HTTPS] Listening on https://${HOST}:${PORT_HTTPS}`);
  });
}

async function main() {
  try {
    await app.prepare();

    let credentials;
    try {
      const key = fs.readFileSync(SSL_KEY_PATH);
      const cert = fs.readFileSync(SSL_CERT_PATH);
      credentials = { key, cert };
      console.log(`[SSL  ] Loaded certificates from:\n  key:  ${SSL_KEY_PATH}\n  cert: ${SSL_CERT_PATH}`);
    } catch (e) {
      console.error('[SSL  ] Failed to load SSL certificates.');
      console.error(`Tried key: ${SSL_KEY_PATH}`);
      console.error(`Tried cert: ${SSL_CERT_PATH}`);
      console.error(e);
      if (!dev) {
        // In production we expect certs to be present
        process.exit(1);
      } else {
        console.warn('[SSL  ] Continuing in dev without HTTPS. Starting only HTTP (no redirect).');
        const httpServer = http.createServer((req, res) => handle(req, res));
        httpServer.listen(PORT_HTTP, HOST, () => {
          console.log(`[HTTP ] (dev) Listening on http://${HOST}:${PORT_HTTP}`);
        });
        return;
      }
    }

    startServers(credentials);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
