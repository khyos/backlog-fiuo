import { ITAD } from "$lib/itad/ITAD";
import { LinkType } from "$lib/model/Link";
import { LinkDB } from "$lib/server/model/LinkDB";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { User } from "$lib/model/User";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import type { Price } from "$lib/types/itad/Price";

export async function POST({ request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (user.id < 0) {
        return error(401, 'Unauthorized');
    }
    const { artifactIds } = await request.json();
    const idsMapping = await LinkDB.getLinksMultiple(LinkType.ITAD, artifactIds);
    const itadIds = Object.values(idsMapping);

    const [prices, subscriptions, allServices] = await Promise.all([
        ITAD.getPrices(itadIds),
        ITAD.getSubscriptions(itadIds),
        SubscriptionServiceDB.getAllServices()
    ]);

    // Sync artifact_subscription for each game
    const subsById = new Map(subscriptions.map(s => [s.id, s.subs.map(sub => sub.name)]));
    await Promise.all(
        artifactIds.map((artifactId: number) => {
            const itadId = idsMapping[artifactId];
            if (!itadId) return Promise.resolve();
            const serviceNames = subsById.get(itadId) ?? [];
            return SubscriptionServiceDB.syncArtifactSubscriptions(artifactId, serviceNames, allServices);
        })
    );

    const pricesResult = await Promise.all(
        prices.map(async price => {
            return {
                id: price.id,
                current: price.deals.reduce((min, deal) => Math.min(min, deal.price.amount), Infinity),
                historyLow: price.historyLow.all?.amount ?? undefined
            }
        })
    );
    const result: Record<string, Price | undefined> = {};
    for (const artifactId of artifactIds) {
        result[artifactId] = pricesResult.find(price => price.id === idsMapping[artifactId]);
    }
    return json(result);
}