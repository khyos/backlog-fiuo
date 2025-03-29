import { Artifact, ArtifactType, type IArtifact } from "../Artifact";
import { RatingType } from "../Rating";
import type { Serializable } from "../Serializable";
import { Platform, type IPlatform } from "./Platform";

export const SERIALIZE_TYPE = 'Game';

export interface IGame extends IArtifact {
    platforms?: IPlatform[]
}

export class Game extends Artifact implements Serializable<IGame> {
    platforms: Platform[] = []

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.GAME;
    }

    computeMeanRating(): number | null {
        let nbOfRatings = 0;
        let meanRating = 0;
        let mcRating;
        let ocRating;
        let scRating;
        let steamRating;
        for (const rating of this.ratings) {
            if (rating.rating != null) {
                switch (rating.type) {
                    case RatingType.METACRITIC:
                        mcRating = rating.rating;
                        break;
                    case RatingType.OPENCRITIC:
                        ocRating = rating.rating;
                        break;
                    case RatingType.SENSCRITIQUE:
                        scRating = rating.rating;
                        break;
                    case RatingType.STEAM:
                        steamRating = rating.rating;
                        break;
                    default:
                        break;
                }
            }
        }

        if (mcRating && ocRating) {
            meanRating = (mcRating + ocRating) / 2;
            nbOfRatings++;
        } else if (mcRating) {
            meanRating += mcRating;
            nbOfRatings++;
        } else if (ocRating) {
            meanRating += ocRating;
            nbOfRatings++;
        }

        if (scRating && steamRating) {
            meanRating += (scRating + 0.2 * steamRating) / 1.2;
            nbOfRatings++;
        } else if (scRating) {
            meanRating += scRating;
            nbOfRatings++;
        } else if (steamRating) {
            meanRating += steamRating;
            nbOfRatings++;
        }

        return nbOfRatings > 0 ? meanRating / nbOfRatings : null;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            __type: SERIALIZE_TYPE,
            platforms: this.platforms.map(platform => platform.toJSON())
        }
    }

    static fromJSON(data: IGame) : Game {
        const artifactData = super.fromJSON(data);
        const game = new Game(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        game.links = artifactData.links;
        game.genres = artifactData.genres;
        game.ratings = artifactData.ratings;
        game.tags = artifactData.tags;
        game.userInfo = artifactData.userInfo;
        game.platforms = data.platforms ? data.platforms.map((platformData) => {
            return Platform.fromJSON(platformData);
        }) : [];
        return game;
    }
}