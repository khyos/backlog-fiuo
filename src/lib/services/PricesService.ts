import { ArtifactType } from "$lib/model/Artifact";
import type { Price } from "$lib/types/itad/Price";

export async function fetchPrices(artifactType: ArtifactType, artifactIds: number[]): Promise<Record<string, Price>> {
    if (artifactType === ArtifactType.GAME) {
        const response = await fetch(`/api/game/prices`, {
            method: "POST",
            body: JSON.stringify({
                artifactIds: artifactIds
            })
        });
        return response.json();
    }
    throw new Error('Prices not supported for other artifact types than games')
}