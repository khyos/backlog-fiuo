import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactType } from "$lib/model/Artifact";

export async function GET({ params, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const artifactTypeParam = params.slug;
    
    if (!artifactTypeParam || !Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)) {
        return error(400, 'Invalid artifact type');
    }
    
    const artifactType = artifactTypeParam as ArtifactType;
    
    if (user.id < 0) {
        return error(401, 'Please sign in to access your future list');
    }
    
    const backlog = await BacklogDB.getVirtualFutureBacklog(user.id, artifactType);
    if (!backlog) {
        return error(404, 'Future list not found');
    }
    return json(backlog.toJSON());
}