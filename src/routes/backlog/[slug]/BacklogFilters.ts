import { ArtifactType } from "$lib/model/Artifact"
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog"
import type { BacklogItem } from "$lib/model/BacklogItem";
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

export type BacklogFilters = {
    orderBy: { 
        type: BacklogOrder
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
    tags: {
        included: string[]
        excluded: string[]
    }
}

export function createBacklogFilters(artifactType: ArtifactType, rankingType: BacklogRankingType): BacklogFilters {
    let orderType = BacklogOrder.RANK;
    let orderDirection: 'asc' | 'desc' = 'asc';
    switch (rankingType) {
        case BacklogRankingType.RANK:
            orderType = BacklogOrder.RANK;
            orderDirection = 'asc';
            break;
        case BacklogRankingType.ELO:
            orderType = BacklogOrder.ELO;
            orderDirection = 'desc';
            break;
        case BacklogRankingType.WISHLIST:
            orderType = BacklogOrder.DATE_RELEASE;
            orderDirection = 'asc';
            break;
        default:
            break;
    }
    
    const filters: BacklogFilters = {
        orderBy: { 
            type: orderType,
            direction: orderDirection
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
        },
        tags: {
            included: [],
            excluded: []
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

export function filterBacklogItems(items: BacklogItem[], artifactType: ArtifactType, filters: BacklogFilters) {
    if (filters.orderBy.type === BacklogOrder.DATE_ADDED) {
        items.sort((a, b) => {
            return b.dateAdded - a.dateAdded;
        });
    } else if (filters.orderBy.type === BacklogOrder.DATE_RELEASE) {
        items.sort((a, b) => {
            if (!a.artifact.releaseDate) {
                return -1;
            } else if (!b.artifact.releaseDate) {
                return 1;
            }
            return new Date(a.artifact.releaseDate).getTime() - new Date(b.artifact.releaseDate).getTime();
        });
    } else if (filters.orderBy.type === BacklogOrder.ELO) {
        items.sort((a, b) => {
            return b.elo - a.elo;
        });
    } else if (filters.orderBy.type === BacklogOrder.RANK) {
        items.sort((a, b) => {
            return a.rank - b.rank;
        });
    } else if (filters.orderBy.type === BacklogOrder.RATING) {
        items.sort((a, b) => {
            return (b.artifact.meanRating ?? -Infinity) - (a.artifact.meanRating ?? -Infinity)
        });
    }
    if (filters.genres.included.length > 0) {
        items = items.filter((item) => {
            return item.artifact.genres.some((genre) => {
                return filters.genres.included.includes(genre.id);
            });
        });
    }
    if (filters.genres.excluded.length > 0) {
        items = items.filter((item) => {
            return !item.artifact.genres.some((genre) => {
                return filters.genres.excluded.includes(genre.id);
            });
        });
    }
    if (filters.tags.included.length > 0) {
        items = items.filter((item) => {
            return item.tags.some((tag) => {
                return filters.tags.included.includes(tag.id);
            });
        });
    }
    if (filters.tags.excluded.length > 0) {
        items = items.filter((item) => {
            return !item.tags.some((tag) => {
                return filters.tags.excluded.includes(tag.id);
            });
        });
    }
    if (filters.releaseDate.min > filters.releaseDate.absoluteMin
        || filters.releaseDate.max < filters.releaseDate.absoluteMax) {
        items = items.filter((item) => {
            const artifactYearString = item.artifact.releaseDate;
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
            return item.artifact.duration <= maxDurationInSeconds;
        });
    }
    if (artifactType === ArtifactType.GAME && filters.platforms && filters.platforms.included.length > 0) {
        items = items.filter((item) => {
            return (item.artifact as Game).platforms.some((platform) => {
                return filters.platforms?.included.includes(platform.id);
            });
        });
    }
    if (filters.rating.min > 0) {
        items = items.filter((item) => {
            const meanRating = item.artifact.meanRating;
            return meanRating === null || meanRating >= filters.rating.min;
        });
    }
    return items;
}