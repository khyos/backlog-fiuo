import { Artifact, ArtifactType } from "$lib/model/Artifact";
import { UserListOrder } from "$lib/model/UserList";
import type { Game } from "$lib/model/game/Game";

const GAME_RELEASE_DATE_MIN = 1970;
const GAME_RELEASE_DATE_MAX = 2025;
const MOVIE_RELEASE_DATE_MIN = 1895;
const MOVIE_RELEASE_DATE_MAX = 2025;
const TVSHOW_RELEASE_DATE_MIN = 1930;
const TVSHOW_RELEASE_DATE_MAX = 2025;
const GAME_MAX_DURATION = 200;
const MOVIE_MAX_DURATION = 240;
const TVSHOW_MAX_DURATION = 400;

export type UserListFilters = {
    orderBy: { 
        type: UserListOrder
        direction: 'asc' | 'desc'
    }
    duration: {
        max: number
        absoluteMax: number
        unit: 'hours' | 'minutes'
    }
    genres: {
        included: number[]
        excluded: number[]
    }
    platforms?: {
        included: number[]
    }
    rating: {
        min: number
    }
    releaseDate: {
        min: number
        max: number
        absoluteMin: number
        absoluteMax: number
    }
}

export function createUserListFilters(artifactType: ArtifactType): UserListFilters {
    const filters: UserListFilters = {
        orderBy: { 
            type: UserListOrder.DATE_RELEASE,
            direction: 'asc'
        },
        duration: {
            max: 0,
            absoluteMax: 0,
            unit: 'hours'
        },
        genres: {
            included: [],
            excluded: []
        },
        rating: {
            min: 0
        },
        releaseDate: {
            min: 0,
            max: 0,
            absoluteMin: 0,
            absoluteMax: 0
        }
    }
    if (artifactType === ArtifactType.GAME) {
        filters.duration.max = GAME_MAX_DURATION;
        filters.duration.absoluteMax = GAME_MAX_DURATION;
        filters.duration.unit = 'hours';
        filters.releaseDate.min = GAME_RELEASE_DATE_MIN;
        filters.releaseDate.max = GAME_RELEASE_DATE_MAX;
        filters.releaseDate.absoluteMin = GAME_RELEASE_DATE_MIN;
        filters.releaseDate.absoluteMax = GAME_RELEASE_DATE_MAX;
        filters.platforms = {
            included: []
        };
    } else if (artifactType === ArtifactType.MOVIE) {
        filters.duration.max = MOVIE_MAX_DURATION;
        filters.duration.absoluteMax = MOVIE_MAX_DURATION;
        filters.duration.unit = 'minutes';
        filters.releaseDate.min = MOVIE_RELEASE_DATE_MIN;
        filters.releaseDate.max = MOVIE_RELEASE_DATE_MAX;
        filters.releaseDate.absoluteMin = MOVIE_RELEASE_DATE_MIN;
        filters.releaseDate.absoluteMax = MOVIE_RELEASE_DATE_MAX;
    } else if (artifactType === ArtifactType.TVSHOW) {
        filters.duration.max = TVSHOW_MAX_DURATION;
        filters.duration.absoluteMax = TVSHOW_MAX_DURATION;
        filters.duration.unit = 'hours';
        filters.releaseDate.min = TVSHOW_RELEASE_DATE_MIN;
        filters.releaseDate.max = TVSHOW_RELEASE_DATE_MAX;
        filters.releaseDate.absoluteMin = TVSHOW_RELEASE_DATE_MIN;
        filters.releaseDate.absoluteMax = TVSHOW_RELEASE_DATE_MAX;
    }
    return filters;
}

export function filterUserListItems(items: Artifact[], artifactType: ArtifactType, filters: UserListFilters) {
    if (filters.orderBy.type === UserListOrder.DATE_RELEASE) {
        items.sort((a, b) => {
            if (!a.releaseDate) {
                return -1;
            } else if (!b.releaseDate) {
                return 1;
            }
            return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        });
    }
    if (filters.genres.included.length > 0) {
        items = items.filter((item) => {
            return item.genres.some((genre) => {
                return filters.genres.included.includes(genre.id);
            });
        });
    }
    if (filters.genres.excluded.length > 0) {
        items = items.filter((item) => {
            return !item.genres.some((genre) => {
                return filters.genres.excluded.includes(genre.id);
            });
        });
    }
    if (filters.releaseDate.min > filters.releaseDate.absoluteMin
        || filters.releaseDate.max < filters.releaseDate.absoluteMax) {
        items = items.filter((item) => {
            const artifactYearString = item.releaseDate;
            let artifactYear: number | null = null;
            if (artifactYearString) {
                artifactYear = new Date(artifactYearString).getFullYear();
            }
            return (
                artifactYear == null ||
                (artifactYear >= filters.releaseDate.min &&
                artifactYear <= filters.releaseDate.max)
            );
        });
    }
    if (filters.duration.max < filters.duration.absoluteMax) {
        let maxDurationInSeconds: number;
        if (artifactType === ArtifactType.GAME || artifactType === ArtifactType.TVSHOW) {
            maxDurationInSeconds = filters.duration.max * 3600;
        } else if (artifactType === ArtifactType.MOVIE) {
            maxDurationInSeconds = filters.duration.max * 60;
        }
        items = items.filter((item) => {
            return item.duration <= maxDurationInSeconds;
        });
    }
    if (artifactType === ArtifactType.GAME && filters.platforms && filters.platforms.included.length > 0) {
        items = items.filter((item) => {
            return (item as Game).platforms.some((platform) => {
                return filters.platforms?.included.includes(platform.id);
            });
        });
    }
    if (filters.rating.min > 0) {
        items = items.filter((item) => {
            const meanRating = item.meanRating;
            return meanRating === null || meanRating >= filters.rating.min;
        });
    }
    return items;
}