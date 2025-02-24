import { ITAD } from "$lib/itad/ITAD";
import { LinkType } from "$lib/model/Link";
import { LinkDB } from "$lib/server/model/LinkDB";
import { json } from "@sveltejs/kit";

export async function POST({ request }: any) {
    const { artifactIds } = await request.json();
    const idsMapping = await LinkDB.getLinksMultiple(LinkType.ITAD, artifactIds);
    const itadIds = Object.values(idsMapping);
    let prices = await ITAD.getPrices(itadIds);
    prices = await Promise.all(
        prices.map(async price => {
            return {
                id: price.id,
                //slug: await ITAD.getSlugFromId(price.id),
                current: price.deals.reduce((min, deal) => Math.min(min, deal.price.amount), Infinity),
                historyLow: price.historyLow.all?.amount ?? 0
            }
        })
    );
    const result = {};
    for (const artifactId of artifactIds) {
        result[artifactId] = prices.find(price => price.id === idsMapping[artifactId]);
    }
    return json(result);
}