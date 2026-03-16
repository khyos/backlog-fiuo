/**
 * Core logic for extracting ratings and completion dates from a SensCritique
 * user collection via the GraphQL API.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SC_GQL_URL = 'https://apollo.senscritique.com/';
export const SC_BASE_URL = 'https://www.senscritique.com';
const BATCH_SIZE = 100;

export const UNIVERSE_LABELS: Record<number, string> = {
	1: 'Films',
	2: 'Livres',
	3: 'Jeux vidéo',
	4: 'Séries',
	5: 'Podcasts',
	6: 'BDs',
	7: 'Albums',
	8: 'Morceaux',
};

/** Maps CLI-friendly aliases to the API universe string values */
export const UNIVERSE_ALIASES: Record<string, string> = {
	film: 'movie',
	films: 'movie',
	movie: 'movie',
	movies: 'movie',
	book: 'book',
	books: 'book',
	livre: 'book',
	livres: 'book',
	game: 'game',
	games: 'game',
	jeu: 'game',
	jeux: 'game',
	tvshow: 'tvShow',
	tvshows: 'tvShow',
	serie: 'tvShow',
	series: 'tvShow',
	séries: 'tvShow',
	bd: 'bd',
	bds: 'bd',
	comicbook: 'bd',
	comicbooks: 'bd',
	album: 'musicAlbum',
	albums: 'musicAlbum',
	track: 'musicTrack',
	tracks: 'musicTrack',
	morceau: 'musicTrack',
	morceaux: 'musicTrack',
};

// ---------------------------------------------------------------------------
// GraphQL query
// ---------------------------------------------------------------------------

const USER_COLLECTION_QUERY = `
query UserCollection(
  $limit: Int
  $offset: Int
  $order: CollectionSort
  $universe: String
  $username: String!
) {
  user(username: $username) {
    name
    medias {
      avatar
      __typename
    }
    collection(
      limit: $limit
      offset: $offset
      order: $order
      universe: $universe
    ) {
      total
      products {
        id
        title
        originalTitle
        universe
        url
        yearOfProduction
        dateRelease
        frenchReleaseDate
        rating
        medias {
          picture
          __typename
        }
        genresInfos {
          label
          __typename
        }
        directors { name person_id url __typename }
        authors   { name person_id url __typename }
        creators  { name person_id url __typename }
        developers { name person_id url __typename }
        artists   { name person_id url __typename }
        pencillers { name person_id url __typename }
        otherUserInfos(username: $username) {
          rating
          dateDone
          isWished
          isDone
          review {
            id
            url
            bodyText
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Creator {
	name: string;
}

interface ProductUserInfos {
	rating: number | null;
	dateDone: string | null;
	isWished: boolean;
	isDone: boolean;
	review: { bodyText: string | null; url: string | null } | null;
}

interface Product {
	id: number;
	title: string;
	originalTitle: string | null;
	universe: number;
	url: string;
	yearOfProduction: number | null;
	dateRelease: string | null;
	frenchReleaseDate: string | null;
	rating: number | null;
	medias: { picture: string | null };
	genresInfos: Array<{ label: string }>;
	directors: Creator[];
	authors: Creator[];
	creators: Creator[];
	developers: Creator[];
	artists: Creator[];
	pencillers: Creator[];
	otherUserInfos: ProductUserInfos | null;
}

interface GQLResponse {
	data?: {
		user?: {
			name: string;
			medias: { avatar: string | null };
			collection?: {
				total: number;
				products: Product[];
			};
		};
	};
	errors?: Array<{ message: string }>;
}

export interface ExportItem {
	id: number;
	title: string;
	originalTitle: string | null;
	universe: number;
	universeLabel: string;
	year: number | null;
	url: string;
	coverUrl: string | null;
	genres: string[];
	creators: string;
	communityRating: number | null;
	userRating: number | null;
	dateDone: string | null;
	isDone: boolean;
	isWished: boolean;
	review?: string | null;
}

export interface ExportResult {
	username: string;
	displayName: string;
	extractedAt: string;
	filters: {
		universe: string | null;
		mode: ExportMode;
	};
	totalInCollection: number;
	exportedCount: number;
	items: ExportItem[];
}

export type ExportMode = 'done' | 'wished' | 'all';

export interface ExportOptions {
	/** SensCritique API universe string (e.g. 'movie', 'game', 'tvShow') or null for all */
	universe: string | null;
	/** Which items to include */
	mode: ExportMode;
	/** Whether to include review body text */
	withReviews: boolean;
	/** Optional progress callback (loaded, total) */
	onProgress?: (loaded: number, total: number) => void;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchPage(
	username: string,
	offset: number,
	universe: string | null,
): Promise<{ total: number; products: Product[]; displayName: string }> {
	const variables: Record<string, unknown> = {
		username,
		limit: BATCH_SIZE,
		offset,
		order: 'LAST_ACTION_DESC',
		universe: universe ?? null,
	};

	const body = JSON.stringify({
		operationName: 'UserCollection',
		variables,
		query: USER_COLLECTION_QUERY,
	});

	const res = await fetch(SC_GQL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Referer: 'https://www.senscritique.com/',
			Origin: 'https://www.senscritique.com',
		},
		body,
	});

	if (!res.ok) {
		throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	}

	const gqlRes = (await res.json()) as GQLResponse;

	if (gqlRes.errors?.length) {
		throw new Error(`GraphQL error: ${gqlRes.errors.map((e) => e.message).join(', ')}`);
	}

	const user = gqlRes.data?.user;
	if (!user) {
		throw new Error(
			`Utilisateur "${username}" introuvable ou profil privé. Vérifiez que le profil est bien public.`,
		);
	}

	const collection = user.collection;
	if (!collection) {
		throw new Error(`Impossible de récupérer la collection de "${username}".`);
	}

	return {
		total: collection.total,
		products: collection.products ?? [],
		displayName: user.name ?? username,
	};
}

async function fetchAllPages(
	username: string,
	universe: string | null,
	onProgress?: (loaded: number, total: number) => void,
): Promise<{ products: Product[]; total: number; displayName: string }> {
	const allProducts: Product[] = [];

	const first = await fetchPage(username, 0, universe);
	allProducts.push(...first.products);
	onProgress?.(allProducts.length, first.total);

	let offset = BATCH_SIZE;
	while (offset < first.total) {
		const page = await fetchPage(username, offset, universe);
		allProducts.push(...page.products);
		onProgress?.(allProducts.length, first.total);
		offset += BATCH_SIZE;
	}

	return { products: allProducts, total: first.total, displayName: first.displayName };
}

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

/** Converts a UTC timestamp string to a local YYYY-MM-DD date (Europe/Paris) */
function toLocalDate(dateDone: string | null): string | null {
	if (!dateDone) return null;
	try {
		const utcDate = new Date(dateDone);
		if (isNaN(utcDate.getTime())) return null;
		const parts = new Intl.DateTimeFormat('fr-FR', {
			timeZone: 'Europe/Paris',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(utcDate);
		const year = parts.find((p) => p.type === 'year')?.value;
		const month = parts.find((p) => p.type === 'month')?.value;
		const day = parts.find((p) => p.type === 'day')?.value;
		if (!year || !month || !day) return null;
		return `${year}-${month}-${day}`;
	} catch {
		return null;
	}
}

function extractCreators(product: Product): string {
	switch (product.universe) {
		case 1: // Films
			return product.directors?.map((d) => d.name).join(', ') ?? '';
		case 2: // Livres
			return product.authors?.map((a) => a.name).join(', ') ?? '';
		case 3: // Jeux vidéo
			return product.developers?.map((d) => d.name).join(', ') ?? '';
		case 4: // Séries
			return (
				product.creators?.map((c) => c.name).join(', ') ||
				product.directors?.map((d) => d.name).join(', ') ||
				''
			);
		case 6: // BDs
			return (
				product.authors?.map((a) => a.name).join(', ') ||
				product.pencillers?.map((p) => p.name).join(', ') ||
				''
			);
		case 7: // Albums
		case 8: // Morceaux
			return product.artists?.map((a) => a.name).join(', ') ?? '';
		default:
			return (
				product.directors?.map((d) => d.name).join(', ') ||
				product.creators?.map((c) => c.name).join(', ') ||
				product.authors?.map((a) => a.name).join(', ') ||
				''
			);
	}
}

function toExportItem(product: Product, withReviews: boolean): ExportItem {
	const userInfos = product.otherUserInfos;
	const item: ExportItem = {
		id: product.id,
		title: product.originalTitle ?? product.title,
		originalTitle: product.originalTitle,
		universe: product.universe,
		universeLabel: UNIVERSE_LABELS[product.universe] ?? `Univers ${product.universe}`,
		year:
			product.yearOfProduction ??
			(product.dateRelease ? parseInt(product.dateRelease.substring(0, 4)) : null) ??
			(product.frenchReleaseDate ? parseInt(product.frenchReleaseDate.substring(0, 4)) : null),
		url: `${SC_BASE_URL}${product.url}`,
		coverUrl: product.medias?.picture ?? null,
		genres: product.genresInfos?.map((g) => g.label) ?? [],
		creators: extractCreators(product),
		communityRating: product.rating,
		userRating: userInfos?.rating ?? null,
		dateDone: toLocalDate(userInfos?.dateDone ?? null),
		isDone: userInfos?.isDone ?? false,
		isWished: userInfos?.isWished ?? false,
	};
	if (withReviews) {
		item.review = userInfos?.review?.bodyText ?? null;
	}
	return item;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches and returns a SensCritique user collection as a structured JSON export.
 */
export async function exportUserCollection(
	username: string,
	options: ExportOptions,
): Promise<ExportResult> {
	const { universe, mode, withReviews, onProgress } = options;

	const { products, total, displayName } = await fetchAllPages(username, universe, onProgress);

	const filtered = products.filter((p) => {
		const info = p.otherUserInfos;
		if (!info) return false;
		if (mode === 'done') return info.isDone === true;
		if (mode === 'wished') return info.isWished === true;
		return info.isDone === true || info.isWished === true;
	});

	const items = filtered.map((p) => toExportItem(p, withReviews));

	return {
		username,
		displayName,
		extractedAt: new Date().toISOString(),
		filters: { universe, mode },
		totalInCollection: total,
		exportedCount: items.length,
		items,
	};
}
