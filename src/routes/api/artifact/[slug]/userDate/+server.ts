import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        error(500, "invalid user");
    }
    const artifactId = parseInt(params.slug);
    const { date, startEnd } = await request.json();
    ArtifactDB.setUserDate(user.id, artifactId, date, startEnd);
    
    return json({ success: true });
}