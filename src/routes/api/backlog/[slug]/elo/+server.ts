import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
	const user = User.deserialize(locals.user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(user, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { winnerArtifactId, loserArtifactId } = await request.json();
    try {
        await BacklogDB.eloFight(backlogId, winnerArtifactId, loserArtifactId);
        return json({});
    } catch (e) {
        return error(500, e instanceof Error ? e.message : 'Unknown Error');
    }
}