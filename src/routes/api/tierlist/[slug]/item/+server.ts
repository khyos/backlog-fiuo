import { User } from "#lib/model/User";
import { ArtifactDB } from "#lib/server/model/ArtifactDB";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    if (isNaN(tierListId)) return error(400, 'Invalid id');
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const tierList = await TierListDB.getTierListById(tierListId);
    if (!tierList) {
        return error(404, 'Not found');
    }
    if (!tierList.isStandalone) {
        return error(400, 'Not a standalone tier list');
    }
    const { artifactId } = await request.json();
    const artifact = await ArtifactDB.getArtifactById(artifactId);
    if (!artifact) {
        return error(404, 'Artifact not found');
    }
    if (artifact.type !== tierList.artifactType) {
        return error(400, 'Artifact type mismatch');
    }
    const existingIds = await TierListDB.getItemArtifactIds(tierListId);
    if (existingIds.includes(artifactId)) {
        return error(409, 'Artifact already in tier list');
    }
    await TierListDB.addUnrankedItems(tierListId, [artifactId]);
    return json({ success: true });
}

export async function DELETE({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    const tierListId = parseInt(params.slug);
    if (isNaN(tierListId)) return error(400, 'Invalid id');
    const authorization = await TierListDB.canEditTierList(user, tierListId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
    const { artifactId } = await request.json();
    await TierListDB.deleteItem(tierListId, artifactId);
    return json({ success: true });
}
