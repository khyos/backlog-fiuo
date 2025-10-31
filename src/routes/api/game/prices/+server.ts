import { ITAD } from "$lib/itad/ITAD";
import { LinkType } from "$lib/model/Link";
import { LinkDB } from "$lib/server/model/LinkDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import type { Price } from "$lib/types/itad/Price";

export async function POST({ request }: RequestEvent) {
    const { artifactIds } = await request.json();
    const idsMapping = await LinkDB.getLinksMultiple(LinkType.ITAD, artifactIds);
    const itadIds = Object.values(idsMapping);
    const prices = await ITAD.getPrices(itadIds);
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