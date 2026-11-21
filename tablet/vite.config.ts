import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function resolveAgainst(baseUrl: string, ref: string): string {
  try {
    return new URL(ref, baseUrl).href;
  } catch {
    return ref;
  }
}

function proxyHref(absoluteUrl: string): string {
  return `/media-proxy?url=${encodeURIComponent(absoluteUrl)}`;
}

function rewriteM3u8(body: string, playlistUrl: string): string {
  return body
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
          return `URI="${proxyHref(resolveAgainst(playlistUrl, uri))}"`;
        });
      }
      return proxyHref(resolveAgainst(playlistUrl, trimmed));
    })
    .join('\n');
}

function readRequestUrl(req: IncomingMessage): string {
  return req.url || '/';
}

/** HLS / medya CORS proxy — localhost ve Capacitor webview için */
function mediaProxyPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const raw = readRequestUrl(req);
    if (!raw.startsWith('/media-proxy')) {
      next();
      return;
    }

    try {
      const parsed = new URL(raw, 'http://127.0.0.1');
      const target = parsed.searchParams.get('url') || '';
      if (!/^https?:\/\//i.test(target)) {
        res.statusCode = 400;
        res.end('invalid url');
        return;
      }

      const upstream = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
          Referer: new URL(target).origin + '/',
          Origin: new URL(target).origin,
        },
        redirect: 'follow',
      });

      if (!upstream.ok) {
        res.statusCode = upstream.status;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(`upstream ${upstream.status}`);
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const isPlaylist =
        /mpegurl|m3u8|application\/vnd\.apple\.mpegurl/i.test(contentType) ||
        /\.m3u8(\?|$)/i.test(target);

      res.statusCode = 200;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');

      if (isPlaylist) {
        const text = await upstream.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.end(rewriteM3u8(text, target));
        return;
      }

      res.setHeader('Content-Type', contentType);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(err instanceof Error ? err.message : 'proxy error');
    }
  };

  return {
    name: 'saloon-media-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handler(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handler(req, res, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mediaProxyPlugin()],
  base: './',
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, '../shared'),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    fs: {
      allow: [rootDir, path.resolve(rootDir, '../shared')],
    },
  },
});
