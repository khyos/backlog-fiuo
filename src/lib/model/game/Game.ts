import { Artifact, ArtifactType } from "../Artifact";
import { Platform } from "./Platform";

export class Game extends Artifact {
    platforms: Platform[] = []

    constructor(id: number, title: string, type: ArtifactType, releaseDate: Date | null, duration: number) {
        super(id, title, type, releaseDate, duration);
        this.type = ArtifactType.GAME;
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