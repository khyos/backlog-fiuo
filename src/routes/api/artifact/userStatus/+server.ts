import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        error(500, "invalid user");
    }
    const { artifactIds, status } = await request.json();
    ArtifactDB.setUserStatus(user.id, artifactIds, status);
    
    return json({ success: true });
}