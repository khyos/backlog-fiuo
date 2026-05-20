import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const artifactId = parseInt(params.slug);
    const { score } = await request.json();
    if (score < 0 || score > 100) {
        return error(400, "Score must be between 0 and 100");
    }
    await ArtifactDB.setUserScore(user.id, artifactId, score);

    return json({ success: true });
}