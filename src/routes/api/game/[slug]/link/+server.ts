import { HLTB } from "$lib/hltb/HLTB";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ params, request, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
  	const gameId = parseInt(params.slug);
    const { type, url } = await request.json();
    if (type === LinkType.HLTB) {
        const duration = await HLTB.getGameDuration(url);
        await GameDB.updateDuration(gameId, duration);
    } else if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getGameRating(url);
        if (scRating) {
            await RatingDB.addRating(gameId, RatingType.SENSCRITIQUE, scRating);
        }
    } else if (type === LinkType.OPENCRITIC) {
        const ocGame = await OpenCritic.getGame(url);
        if (ocGame && ocGame.medianScore >= 0) {
            await RatingDB.addRating(gameId, RatingType.OPENCRITIC, Math.round(ocGame.medianScore));
        }
    } else if (type === LinkType.METACRITIC) {
        const mcRating = await MetaCritic.getGameRating(url);
        if (mcRating) {
            await RatingDB.addRating(gameId, RatingType.METACRITIC, mcRating);
        }
    }
    LinkDB.addLink(gameId, type, url);
    json({ success: true });
}

export async function PUT({ params, request, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const gameId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(gameId);
    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.HLTB) {
                const duration = await HLTB.getGameDuration(url);
                await GameDB.updateDuration(gameId, duration);
            } else if (type === LinkType.OPENCRITIC) {
                const ocGame = await OpenCritic.getGame(url);
                if (ocGame && ocGame.medianScore >= 0) {
                    await RatingDB.updateRating(gameId, RatingType.OPENCRITIC, Math.round(ocGame.medianScore));
                }
            } else if (type === LinkType.SENSCRITIQUE) {
                const scRating = await SensCritique.getGameRating(url);
                if (scRating) {
                    await RatingDB.updateRating(gameId, RatingType.SENSCRITIQUE, scRating);
                }
            } else if (type === LinkType.METACRITIC) {
                const mcRating = await MetaCritic.getGameRating(url);
                if (mcRating) {
                    await RatingDB.updateRating(gameId, RatingType.METACRITIC, mcRating);
                }
            }
        }
    }
    return json({ success: true });
}