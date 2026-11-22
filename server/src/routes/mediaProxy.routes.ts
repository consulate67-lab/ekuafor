import { Router, Request, Response } from 'express';

const router = Router();

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

/** HLS / medya CORS proxy — tablet web (/tablet) için */
async function handleMediaProxy(req: Request, res: Response) {
    const target = String(req.query.url || '');
    if (!/^https?:\/\//i.test(target)) {
        res.status(400).send('invalid url');
        return;
    }

    try {
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
            res.status(upstream.status);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(`upstream ${upstream.status}`);
            return;
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const isPlaylist =
            /mpegurl|m3u8|application\/vnd\.apple\.mpegurl/i.test(contentType) ||
            /\.m3u8(\?|$)/i.test(target);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-store');

        if (isPlaylist) {
            const text = await upstream.text();
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(rewriteM3u8(text, target));
            return;
        }

        res.setHeader('Content-Type', contentType);
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
    } catch (err) {
        res.status(502);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(err instanceof Error ? err.message : 'proxy error');
    }
}

router.get('/', handleMediaProxy);
router.get('/media-proxy', handleMediaProxy);

export default router;
export { handleMediaProxy };
