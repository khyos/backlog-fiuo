import type { ArtifactType } from "$lib/model/Artifact";
import type { UserArtifactStatus } from "$lib/model/UserArtifact";
import { UserList } from "$lib/model/UserList";

export async function fetchUserList(userId: number, artifactType: ArtifactType) {
    const response = await fetch(`/api/userList/${userId}/${artifactType}`);
    const userListJSON = await response.json();
    return UserList.fromJSON(userListJSON);
};

export async function addUserListItem(userId: number, artifactId: number, status: UserArtifactStatus) {
    const response = await fetch(`/api/userList/${userId}/add`, {
        method: "POST",
        body: JSON.stringify({
            artifactId: artifactId,
            status: status
        })
    });
    if (!response.ok) {
        throw new Error('Error while adding Item to List');
    }
    return response.json();
};
