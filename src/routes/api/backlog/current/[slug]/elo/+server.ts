import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ErrorUtil } from "$lib/util/ErrorUtil";
import { ArtifactType } from "$lib/model/Artifact";

export async function POST({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const artifactTypeParam = params.slug;
    
    if (!artifactTypeParam || !Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)) {
        return error(400, 'Invalid artifact type');
    }
    
    const authorization = await BacklogDB.canEditVirtualWishlistBacklog(user, user.id);
    
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    
	const { winnerArtifactId, loserArtifactId } = await request.json();
    
    try {
        await BacklogDB.eloFightVirtualWishlist(user.id, winnerArtifactId, loserArtifactId);
        return json({});
    } catch (e) {
        return error(500, ErrorUtil.getErrorMessage(e));
    }
}