import { error } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

const ALLOWED_HOSTS = new Set(['images.igdb.com', 'image.tmdb.org']);

function isAllowedHost(hostname: string): boolean {
    if (ALLOWED_HOSTS.has(hostname)) {
        return true;
    }
    return hostname === 'myanimelist.net' || hostname.endsWith('.myanimelist.net');
}

export async function GET({ url, fetch }: RequestEvent) {
    const target = url.searchParams.get('url');
    if (!target) {
        return error(400, 'Missing url');
    }

    let parsed: URL;
    try {
        parsed = new URL(target);
    } catch {
        return error(400, 'Invalid url');
    }

    if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
        return error(400, 'Host not allowed');
    }

    const response = await fetch(parsed.toString());
    if (!response.ok) {
        return error(response.status, 'Failed to fetch image');
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const body = await response.arrayBuffer();
    return new Response(body, {
        headers: {
            'content-type': contentType,
            'cache-control': 'public, max-age=86400'
        }
    });
}
