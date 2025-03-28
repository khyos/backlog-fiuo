import type { ArtifactType } from "$lib/model/Artifact";
import type { Backlog } from "$lib/model/Backlog";

export async function fetchBacklog(backlogId: number) {
    const response = await fetch(`/api/backlog/${backlogId}`);
    return await response.json();
};

export async function fetchBacklogs(artifactType: ArtifactType): Promise<Backlog[]> {
    const response = await fetch(`/api/backlog/list?artifactType=${artifactType}`);
    if (!response.ok) {
        throw new Error('Error while Fetching Backlog List');
    }
    return await response.json();
};

export async function addBacklogItem(backlogId: number, artifactId: number) {
    const response = await fetch(`/api/backlog/${backlogId}/add`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId
        })
    });
    if (!response.ok) {
        throw new Error('Error while adding Backlog Item');
    }
    return response.json();
};

export async function deleteBacklogItem(backlogId: number, artifactId: number) {
    const response = await fetch(`/api/backlog/${backlogId}/delete`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId,
        })
    });
    if (!response.ok) {
        throw new Error('Error while deleting Backlog Item');
    }
    return response.json();
};

export async function moveBacklogItemToOtherBacklog(fromBacklogId: number, toBacklogId: number, artifactId: number, keepTags: boolean) {
    const response = await fetch(`/api/backlog/move`, {
        method: "POST",
        body: JSON.stringify({
            fromBacklogId: fromBacklogId,
            toBacklogId: toBacklogId,
            artifactId: artifactId,
            keepTags: keepTags
        }),
    });
    if (!response.ok) {
        throw new Error('Error while moving Backlog Item to other Backlog');
    }
}