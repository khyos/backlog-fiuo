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
    const { date, startEnd } = await request.json();
    await ArtifactDB.setUserDate(user.id, artifactId, date, startEnd);

    return json({ success: true });
}