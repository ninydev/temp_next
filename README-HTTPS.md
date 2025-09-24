# Next.js HTTPS + dual ports (80 → 443) in Azure Container

This project is configured to run a custom Node.js server that:
- serves the Next.js app over HTTPS on port 443 using your Let's Encrypt certificates
- listens on HTTP port 80 and redirects all traffic to HTTPS

The behavior is enabled when you run:

```
npm run build
npm run start
```

The start script launches `src/server.js`, which creates both HTTP and HTTPS servers and forwards requests to Next.js.

## File changes
- `src/server.js` — custom server that loads certificates and starts HTTP(80) + HTTPS(443).
- `src/package.json` — the `start` script now runs `NODE_ENV=production node server.js`.

## Certificate paths
By default, the server reads certificates from the typical Let’s Encrypt location that you mentioned inside your Azure container:

- Key: `/etc/letsencrypt/live/pv32itstep.northeurope.cloudapp.azure.com/privkey.pem`
- Cert (full chain): `/etc/letsencrypt/live/pv32itstep.northeurope.cloudapp.azure.com/fullchain.pem`

You can override these via environment variables if needed:
- `SSL_KEY_PATH`
- `SSL_CERT_PATH`

## Ports and host
- HTTP: `PORT_HTTP` (default 80)
- HTTPS: `PORT_HTTPS` (default 443)
- Host bind: `HOST` (default `0.0.0.0` for containers)

In production, HTTP (80) strictly redirects to HTTPS (443).

## Typical Azure Container workflow (Git-based deployment)
1. Push your changes to the repository.
2. Azure pulls and builds your app in the container.
3. Ensure Let’s Encrypt certificates are present at the given paths (or set env vars to match your actual paths).
4. The container runs build + start (if you configured the startup command accordingly), for example:
   - `npm ci`
   - `npm run build`
   - `npm run start`

If you manage startup commands yourself, ensure they run inside the `src/` folder (where `package.json` lives), or change your container’s working directory accordingly.

## Run in background (so it keeps running after you logout)
We added PM2 (a Node.js process manager). You can start the server in the background and keep it running even after you close SSH:

Inside the `src/` directory:

```
# install deps and build
npm ci
npm run build

# start in background with PM2
npm run start:pm2

# (optional) save the PM2 process list to restore on container restart
npm run pm2:save

# view logs
npm run logs:pm2

# restart/stop
npm run restart:pm2
npm run stop:pm2
```

Also available: an ecosystem file `src/ecosystem.config.cjs`. You can run it with:

```
npx pm2 start ecosystem.config.cjs
```

Notes:
- In Azure “git to container” scenarios, the container should run your process in the foreground automatically. If you start the app manually over SSH, use PM2 to detach it from your shell.
- If the container itself restarts, you may need to re-run `pm2 start` unless you configure a startup script in the container image. `pm2 save` stores the process list; restoring on boot requires `pm2 startup`, which might need additional privileges not present in minimal containers.

## Environment variables (optional)
Set any of these in your container if you need custom values:

- `HOST` — default `0.0.0.0`
- `PORT_HTTP` — default `80`
- `PORT_HTTPS` — default `443`
- `SSL_KEY_PATH` — path to private key (PEM)
- `SSL_CERT_PATH` — path to fullchain cert (PEM)

## Local development notes
- For development, you can continue using `npm run dev` (Next.js dev server) as before.
- The custom HTTPS server is focused on production (`npm run start`). In dev, you can run it via `NODE_ENV=development node src/server.js` if you also provide local test certificates.

## Troubleshooting
- Error: "Failed to load SSL certificates" during start: Make sure the files are present and readable by the container’s user. You can mount or generate them inside the container at the expected paths or set `SSL_KEY_PATH`/`SSL_CERT_PATH` to where they are.
- Port binding errors (EACCES or EADDRINUSE): Ensure the container/service has permissions to bind to 80/443 and that no other process uses them. In some platforms, you may need to run as root or use capabilities to bind to privileged ports (<1024).
- Reverse proxy/load balancer: If you already front this container with Azure Application Gateway or Nginx that terminates TLS, you should disable this HTTPS server and use `next start` or adjust ports accordingly.

## Security note
This setup terminates TLS directly in the Node.js process. Keep your certificates secure and restrict access permissions to key files and the running process.
