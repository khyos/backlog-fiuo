import type { ArtifactType } from "$lib/model/Artifact";

export async function createTag(id: string, artifactType: ArtifactType): Promise<void> {
    const response = await fetch(`/api/tag/create`, {
        method: "POST",
        body: JSON.stringify({
            id: id,
            artifactType: artifactType
        }),
    });
    if (!response.ok) {
        throw new Error('Creation of Tag Failed');
    }
}

export async function addTag(backlogId: number, artifactId: number, tagId: string): Promise<void> {
    const response = await fetch(`/api/backlog/${backlogId}/tag`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId,
            tagId: tagId,
        }),
    });
    if (!response.ok) {
        throw new Error('Adding Tag Failed');
    }
}

export async function removeTag(backlogId: number, artifactId: number, tagId: string): Promise<void> {
    const response = await fetch(`/api/backlog/${backlogId}/tag`, {
        method: "DELETE",
        body: JSON.stringify({
            artifactId: artifactId,
            tagId: tagId,
        }),
    });
    if (!response.ok) {
        throw new Error('Removing Tag Failed');
    }
}
