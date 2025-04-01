import { Artifact, ArtifactType, type IArtifact } from "$lib/model/Artifact";
import { Game, type IGame } from "$lib/model/game/Game";
import { Movie } from "$lib/model/movie/Movie";
import { Tvshow } from "$lib/model/tvshow/Tvshow";
import { TvshowEpisode } from "$lib/model/tvshow/TvshowEpisode";
import { TvshowSeason } from "$lib/model/tvshow/TvshowSeason";
import { UserArtifact, UserArtifactStatus, type IUserArtifact } from "$lib/model/UserArtifact";

export async function getPosterURL(artifactType: ArtifactType, artifactId: number) {
    let url = "";
    if (artifactType === ArtifactType.GAME) {
        const response = await fetch(`/api/game/${artifactId}/poster`);
        url = await response.text();
    } else if (artifactType === ArtifactType.MOVIE) {
        const response = await fetch(`/api/movie/${artifactId}/poster`);
        url = await response.text();
    } else if (artifactType === ArtifactType.TVSHOW) {
        const response = await fetch(`/api/tvshow/${artifactId}/poster`);
        url = await response.text();
    }
    return url;
}

export const getArtifact = async (type: ArtifactType, id: number, bFetchUserInfo: boolean = false): Promise<Artifact> => {
    const artifactResponse = await fetch(`/api/${type}/${id}`);
    const artifactJSON: IArtifact = await artifactResponse.json();
    const artifact = artifactFromJSON(type, artifactJSON);
    if (bFetchUserInfo) {
        const userInfosResponse = await fetch(`/api/userartifact/${id}`);
        const userInfosJSON: IUserArtifact[] = await userInfosResponse.json();
        artifact.setUserInfos(Object.fromEntries(
            userInfosJSON.map(userInfo => [userInfo.artifactId, UserArtifact.fromJSON(userInfo)])
        ));
    }
    return artifact;
}

export const artifactFromJSON = (type: ArtifactType, json: IArtifact): Artifact => {
    switch (type) {
        case ArtifactType.GAME:
            return Game.fromJSON(json as IGame);
        case ArtifactType.MOVIE:
            return Movie.fromJSON(json);
        case ArtifactType.TVSHOW:
            return Tvshow.fromJSON(json);
        case ArtifactType.TVSHOW_EPISODE:
            return TvshowEpisode.fromJSON(json);
        case ArtifactType.TVSHOW_SEASON:
            return TvshowSeason.fromJSON(json);
        default:
            throw new Error(`Unsupported artifact type: ${type}`);
    }
}

export const updateStatus = async (artifactIds: number[], status: UserArtifactStatus | null) => {
    return fetch(`/api/artifact/userStatus`, {
        method: "POST",
        body: JSON.stringify({
            artifactIds: artifactIds,
            status: status
        }),
    }).catch(error => {
        console.error("Error updating status:", error);
        alert("Failed to update status");
    });
}

export const updateScore = async (artifactId: number, score: number | null) => {
    fetch(`/api/artifact/${artifactId}/userScore`, {
        method: "POST",
        body: JSON.stringify({
            score: score
        }),
    }).catch(error => {
        console.error("Error updating score:", error);
        alert("Failed to update score");
    });
}

export const updateDate = async (artifactId: number, date: Date | null, startEnd: 'start' | 'end' | 'both') => {
    fetch(`/api/artifact/${artifactId}/userDate`, {
        method: "POST",
        body: JSON.stringify({
            date: date ? date.toISOString() : null,
            startEnd: startEnd
        }),
    }).catch(error => {
        console.error("Error updating score:", error);
        alert("Failed to update score");
    });
}