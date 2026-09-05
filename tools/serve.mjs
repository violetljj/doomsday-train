import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('../build/web-mobile/', import.meta.url)));
const port = Number(process.env.PORT || process.argv.slice(2).find(arg => /^\d+$/.test(arg)) || 0);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        let path = resolve(root, `.${pathname}`);
        if (path !== root && !path.startsWith(root + sep)) {
            response.writeHead(403).end('Forbidden');
            return;
        }
        if (statSync(path).isDirectory()) path = resolve(path, 'index.html');
        if (!statSync(path).isFile()) throw new Error('Not a file');
        response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        createReadStream(path).pipe(response);
    } catch {
        response.writeHead(404).end('Not found');
    }
});
server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}`;
    console.log(`Doomsday Train: ${url}`);
    console.log(`PID ${process.pid}; press Ctrl+C to stop.`);
    if (process.argv.includes('--open')) {
        // URL contains only our literal loopback host and the server-assigned numeric port.
        const opener = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process '${url}'`], { windowsHide: true, stdio: 'ignore' });
        opener.on('error', error => console.error(`Open this URL manually: ${url}\n${error.message}`));
    }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
