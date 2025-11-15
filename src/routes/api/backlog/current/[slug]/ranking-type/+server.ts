import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { ArtifactType } from "$lib/model/Artifact";
import { BacklogRankingType } from "$lib/model/Backlog";

export const GET: RequestHandler = async ({ params, locals }) => {
    const user = User.deserialize(locals.user);
    const artifactTypeParam = params.slug;
    
    if (!artifactTypeParam || !Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)) {
        return error(400, 'Invalid artifact type');
    }
    
    const artifactType = artifactTypeParam as ArtifactType;
    
    if (user.id < 0) {
        return error(401, 'Please sign in to access your wishlist');
    }
    
    try {
        const rankingType = await BacklogDB.getUserWishlistRankingType(user.id, artifactType);
        return json({ rankingType });
    } catch (err) {
        console.error('Error getting wishlist ranking type:', err);
        return error(500, 'Failed to get wishlist ranking type');
    }
}

export const POST: RequestHandler = async ({ params, locals, request }) => {
    const user = User.deserialize(locals.user);
    const artifactTypeParam = params.slug;
    
    if (!artifactTypeParam || !Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)) {
        return error(400, 'Invalid artifact type');
    }
    
    const artifactType = artifactTypeParam as ArtifactType;
    
    if (user.id < 0) {
        return error(401, 'Please sign in to access your wishlist');
    }
    
    const requestBody = await request.json();
    const { rankingType } = requestBody;
    
    if (!rankingType || !Object.values(BacklogRankingType).includes(rankingType)) {
        return error(400, 'Invalid ranking type');
    }
    
    try {
        await BacklogDB.setUserWishlistRankingType(user.id, artifactType, rankingType);
        return json({ success: true, rankingType });
    } catch (err) {
        console.error('Error setting wishlist ranking type:', err);
        return error(500, 'Failed to set wishlist ranking type');
    }
}