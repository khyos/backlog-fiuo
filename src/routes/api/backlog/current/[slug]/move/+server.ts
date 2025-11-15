import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactType } from "$lib/model/Artifact";
import { BacklogRankingType } from "$lib/model/Backlog";

export async function POST({ params, locals, request }: RequestEvent) {
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
    const { srcRank, targetRank } = requestBody;
    
    if (typeof srcRank !== 'number' || typeof targetRank !== 'number') {
        return error(400, 'Invalid rank parameters');
    }
    
    try {
        const rankingType = await BacklogDB.getUserWishlistRankingType(user.id, artifactType);
        
        if (rankingType === BacklogRankingType.RANK) {
            // For manual ranking, move the item from srcRank to targetRank
            await BacklogDB.moveWishlistItem(user.id, artifactType, srcRank, targetRank);
        } else {
            // For other ranking types, manual reordering is not supported
            return json({ success: true, message: 'Ranking type does not support manual reordering' });
        }
        
        return json({ success: true });
    } catch (err) {
        console.error('Error in virtual wishlist ranking update:', err);
        return error(500, 'Failed to update wishlist rankings');
    }
}