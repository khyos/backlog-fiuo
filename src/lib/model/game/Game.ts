import { Artifact, ArtifactType } from "../Artifact";
import { RatingType } from "../Rating";
import { Platform } from "./Platform";

export class Game extends Artifact {
    platforms: Platform[] = []

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date | null, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.GAME;
    }

    getMeanRating(): number | null {
        let nbOfRatings = 0;
        let meanRating = 0;
        let mcRating;
        let ocRating;
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
                    case RatingType.STEAM:
                        meanRating += rating.rating;
                        nbOfRatings++;
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

        return nbOfRatings > 0 ? meanRating / nbOfRatings : null;
    }

    serialize() {
        return {
            ...super.serialize(),
            platforms: this.platforms.map(platform => platform.serialize())
        }
    }

    static deserialize(data: any) : Game {
        const artifactData = super.deserialize(data);
        const game = new Game(artifactData.id, artifactData.title, artifactData.type, artifactData.releaseDate, artifactData.duration);
        game.links = artifactData.links;
        game.genres = artifactData.genres;
        game.ratings = artifactData.ratings;
        game.tags = artifactData.tags;
        game.platforms = data.platforms.map((platformData: any) => {
            return Platform.deserialize(platformData);
        });
        return game;
    }
}