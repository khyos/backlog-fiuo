export interface IMovieReleaseDate {
    country: string
    releaseDate: number
    type?: string
}

export interface IMovieReleaseDateDB {
    id: number
    artifactId: number
    country: string
    releaseDate: number
    type?: string
}

// TMDB release_dates.type enum
export const TMDB_RELEASE_TYPE: Record<number, string> = {
    1: 'premiere',
    2: 'theatrical_limited',
    3: 'theatrical',
    4: 'digital',
    5: 'physical',
    6: 'tv'
};
