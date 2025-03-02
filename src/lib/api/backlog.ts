import type { ArtifactType } from "$lib/model/Artifact";
import type { Backlog } from "$lib/model/Backlog";

export async function fetchBacklog(backlogId: number) {
    const response = await fetch(`/api/backlog/${backlogId}`);
    return await response.json();
};

export async function fetchBacklogs(artifactType: ArtifactType): Promise<Backlog[]> {
    const response = await fetch(`/api/backlog/list?artifactType=${artifactType}`);
    return await response.json();
};

export async function addBacklogItem(backlogId: number, artifactId: number) {
    const response = await fetch(`/api/backlog/${backlogId}/add`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId
        })
    });
    return response.json();
};

export async function deleteBacklogItem(backlogId: number, artifactId: number) {
    const response = await fetch(`/api/backlog/${backlogId}/delete`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId,
        })
    });
    return response.json();
};