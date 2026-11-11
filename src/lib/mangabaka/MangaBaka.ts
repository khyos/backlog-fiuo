interface MangaBakaSearchResponse {
    data?: MangaBakaApiSeries[];
}

interface MangaBakaSeriesResponse {
    data?: MangaBakaApiSeries;
}

interface MangaBakaApiSeries {
    id?: number;
    title?: string | null;
    canonical_url?: string;
    type?: string;
    published?: {
        start_date?: string | null;
    } | null;
    final_volume?: string | null;
    total_chapters?: string | null;
    cover?: {
        x150?: {
            x1?: string | null;
        } | null;
    } | null;
}

export interface MangaBakaManga {
    id: string;
    title: string;
    link: string;
    date?: string;
    poster?: string;
    type: string;
    finalVolume: number | null;
    totalChapters: number | null;
}

export class MangaBaka {
    private static readonly BASE_URL = 'https://api.mangabaka.org/v1';

    static async searchManga(query: string): Promise<{
        id: string;
        name: string;
        link: string;
        date?: string;
        poster?: string;
    }[]> {
        const url = new URL(`${this.BASE_URL}/series/search`);
        url.searchParams.set('q', query);
        url.searchParams.set('type', 'manga');
        url.searchParams.set('limit', '10');

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MangaBaka manga search failed: ${response.status}`);
        }

        const result = await response.json() as MangaBakaSearchResponse;
        if (!Array.isArray(result.data)) {
            throw new Error('Invalid MangaBaka manga search response');
        }

        return result.data.flatMap(manga => {
            if (!Number.isSafeInteger(manga.id) || !manga.title || !manga.canonical_url) {
                return [];
            }
            return [{
                id: String(manga.id),
                name: manga.title,
                link: manga.canonical_url,
                date: manga.published?.start_date ?? undefined,
                poster: manga.cover?.x150?.x1 ?? undefined
            }];
        });
    }

    static async getManga(id: string): Promise<MangaBakaManga | null> {
        const response = await fetch(`${this.BASE_URL}/series/${encodeURIComponent(id)}`);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`MangaBaka manga lookup failed: ${response.status}`);
        }

        const result = await response.json() as MangaBakaSeriesResponse;
        const manga = result.data;
        if (!manga || !Number.isSafeInteger(manga.id) || !manga.title || !manga.canonical_url || !manga.type) {
            throw new Error('Invalid MangaBaka manga response');
        }

        return {
            id: String(manga.id),
            title: manga.title,
            link: manga.canonical_url,
            date: manga.published?.start_date ?? undefined,
            poster: manga.cover?.x150?.x1 ?? undefined,
            type: manga.type,
            finalVolume: this.parseCount(manga.final_volume),
            totalChapters: this.parseCount(manga.total_chapters)
        };
    }

    static extractId(input: string): string | null {
        const value = input.trim();
        if (/^\d+$/.test(value)) {
            const id = Number(value);
            return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
        }

        try {
            const url = new URL(value);
            if (url.hostname !== 'mangabaka.org' && url.hostname !== 'www.mangabaka.org') {
                return null;
            }

            const segments = url.pathname.split('/').filter(Boolean);
            const mangaIndex = segments[0] === 'manga' ? 1 : 0;
            const id = segments[mangaIndex];
            if (!id || !/^\d+$/.test(id)) {
                return null;
            }
            const numericId = Number(id);
            return Number.isSafeInteger(numericId) && numericId > 0 ? String(numericId) : null;
        } catch {
            return null;
        }
    }

    static getUrlFromId(id: string): string {
        return `https://mangabaka.org/manga/${id}`;
    }

    private static parseCount(value: string | null | undefined): number | null {
        if (value === null || value === undefined || value.trim() === '') {
            return null;
        }
        const count = Number(value);
        return Number.isSafeInteger(count) && count >= 0 ? count : null;
    }
}
