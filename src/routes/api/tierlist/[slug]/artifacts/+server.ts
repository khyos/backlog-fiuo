import { User } from "#lib/model/User";
import { ArtifactDB } from "#lib/server/model/ArtifactDB";
import { TierListDB } from "#lib/server/model/TierListDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, url, locals }: RequestEvent) {
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

    const page = parseInt(url.searchParams.get('page') ?? '0');
    if (isNaN(page) || page < 0) return error(400, 'Invalid page');
    const rawPageSize = parseInt(url.searchParams.get('pageSize') ?? '20');
    const pageSize = Math.max(1, Math.min(isNaN(rawPageSize) ? 20 : rawPageSize, 100));
    const search = url.searchParams.get('search') ?? '';

    const [rows, total, presentIds] = await Promise.all([
        ArtifactDB.getArtifacts(tierList.artifactType, page, pageSize, search),
        ArtifactDB.countArtifacts(tierList.artifactType, search),
        TierListDB.getItemArtifactIds(tierListId),
    ]);

    const presentSet = new Set(presentIds);
    const artifacts = rows.map(row => ({
        id: row.id,
        title: row.title,
        alreadyPresent: presentSet.has(row.id),
    }));

    return json({ artifacts, total });
}
