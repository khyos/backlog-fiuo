import { User, UserRights } from "#lib/model/User";
import { BacklogDB } from "#lib/server/model/BacklogDB";
import { TierListUtil, TIER_LIST_ARTIFACT_TYPES } from "#lib/server/model/TierListUtil";
import { ArtifactType } from "#lib/model/Artifact";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.CREATE_BACKLOG)) {
        return error(403, 'Not authorized');
    }
    const body = await request.json();

    if (body.backlogId != null) {
        const authorization = await BacklogDB.canEditBacklog(user, body.backlogId);
        if (authorization.status !== 200) {
            return error(authorization.status, authorization.message);
        }
        const id = await TierListUtil.createTierListFromBacklog(user, body.backlogId);
        if (id == null) {
            return error(500, 'Failed to create tier list');
        }
        return json({ id });
    }

    const { artifactType, title } = body as { artifactType: ArtifactType; title: string };
    if (!artifactType || !title) {
        return error(400, 'Missing artifactType or title');
    }
    if (!TIER_LIST_ARTIFACT_TYPES.includes(artifactType)) {
        return error(400, 'Invalid artifact type');
    }
    const id = await TierListUtil.createStandaloneTierList(user.id, artifactType, title);
    return json({ id });
}
