import { describe, it, expect } from 'vitest';
import { GET } from './+server';
import { LinkType } from '#lib/model/Link';
import { ArtifactType } from '#lib/model/Artifact';

function call(params: Record<string, string>) {
    const url = new URL('http://localhost/api/link/getUrl');
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    // The handler only reads `url`.
    return GET({ url } as never);
}

async function resolvedUrl(response: Response | { json: () => Promise<{ url: string }> }): Promise<string> {
    const body = await (response as Response).json();
    return body.url;
}

describe('GET /api/link/getUrl — MANGABAKA', () => {
    it('builds the MangaBaka series URL from a stored ID for a manga', async () => {
        const response = await call({
            artifactType: ArtifactType.MANGA,
            linkType: LinkType.MANGABAKA,
            linkUrl: '1692',
        });
        expect(await resolvedUrl(response)).toBe('https://mangabaka.org/manga/1692');
    });

    it('does not fall through to the default bare-id behavior for MANGABAKA', async () => {
        const response = await call({
            artifactType: ArtifactType.MANGA,
            linkType: LinkType.MANGABAKA,
            linkUrl: '1692',
        });
        expect(await resolvedUrl(response)).not.toBe('1692');
    });
});

describe('GET /api/link/getUrl — manga siblings still resolve', () => {
    it('MAL manga URL', async () => {
        const response = await call({
            artifactType: ArtifactType.MANGA,
            linkType: LinkType.MAL,
            linkUrl: '1',
        });
        expect(await resolvedUrl(response)).toBe('https://myanimelist.net/manga/1');
    });

    it('SensCritique manga (bd) URL', async () => {
        const response = await call({
            artifactType: ArtifactType.MANGA,
            linkType: LinkType.SENSCRITIQUE,
            linkUrl: 'monster/12345',
        });
        expect(await resolvedUrl(response)).toBe('https://www.senscritique.com/bd/monster/12345');
    });
});
