import { User } from "$lib/model/User";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const subscriptions = await SubscriptionServiceDB.getUserSubscriptions(user.id);
    return json(subscriptions.map(s => s.toJSON()));
}

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const { serviceId } = await request.json();
    if (!serviceId || typeof serviceId !== 'number') {
        return error(400, "serviceId is required");
    }
    await SubscriptionServiceDB.addUserSubscription(user.id, serviceId);
    return json({ success: true });
}

export async function DELETE({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, "Unauthorized");
    }
    const { serviceId } = await request.json();
    if (!serviceId || typeof serviceId !== 'number') {
        return error(400, "serviceId is required");
    }
    await SubscriptionServiceDB.removeUserSubscription(user.id, serviceId);
    return json({ success: true });
}
