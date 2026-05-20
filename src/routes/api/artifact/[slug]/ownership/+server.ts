import { User } from "$lib/model/User";
import { UserArtifactOwnershipDB } from "$lib/server/model/UserArtifactOwnershipDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const artifactId = parseInt(params.slug);
    const ownerships = await UserArtifactOwnershipDB.getOwnershipsForUser(user.id, artifactId);
    return json(ownerships.map(o => o.toJSON()));
}

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const artifactId = parseInt(params.slug);
    const { platform, note } = await request.json();
    if (!platform || typeof platform !== 'string' || platform.trim() === '') {
        return error(400, "platform is required");
    }
    const id = await UserArtifactOwnershipDB.addOwnership(user.id, artifactId, platform.trim(), note ?? null);
    return json({ id });
}

export async function PATCH({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const { id, platform, note } = await request.json();
    if (!id || typeof id !== 'number') {
        return error(400, "id is required");
    }
    if (!platform || typeof platform !== 'string' || platform.trim() === '') {
        return error(400, "platform is required");
    }
    await UserArtifactOwnershipDB.updateOwnership(id, user.id, platform.trim(), note ?? null);
    return json({ success: true });
}

export async function DELETE({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const { id } = await request.json();
    if (!id || typeof id !== 'number') {
        return error(400, "id is required");
    }
    await UserArtifactOwnershipDB.deleteOwnership(id, user.id);
    return json({ success: true });
}
