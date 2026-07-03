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

    const finalDate = date ? new Date(date).getTime() : null;
    if (finalDate !== null && isNaN(finalDate)) {
        return error(400, 'Invalid date');
    }
    if (startEnd !== 'start' && startEnd !== 'end') {
        return error(400, 'Invalid startEnd value, expected "start" or "end"');
    }
    await ArtifactDB.setUserDate(user.id, artifactId, finalDate, startEnd);

    return json({ success: true });
}