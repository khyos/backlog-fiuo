import { User, UserRights } from "$lib/model/User";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ params }: RequestEvent) {
    const artifactId = parseInt(params.slug);
    const services = await SubscriptionServiceDB.getServicesForArtifact(artifactId);
    return json(services.map(s => s.toJSON()));
}

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const artifactId = parseInt(params.slug);
    const { serviceId } = await request.json();
    if (!serviceId || typeof serviceId !== 'number') {
        return error(400, "serviceId is required");
    }
    await SubscriptionServiceDB.linkArtifactToService(artifactId, serviceId);
    return json({ success: true });
}

export async function DELETE({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const artifactId = parseInt(params.slug);
    const { serviceId } = await request.json();
    if (!serviceId || typeof serviceId !== 'number') {
        return error(400, "serviceId is required");
    }
    await SubscriptionServiceDB.unlinkArtifactFromService(artifactId, serviceId);
    return json({ success: true });
}
