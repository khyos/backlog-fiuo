import { HLTB } from "$lib/hltb/HLTB";
import { IGDB } from "$lib/igdb/IGDB";
import { ITAD } from "$lib/itad/ITAD";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { Steam } from "$lib/steam/Steam";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const gameId = parseInt(params.slug);
    const { type, url } = await request.json();
    let finalUrl = url;
    if (type === LinkType.HLTB) {
        const duration = await HLTB.getGameDuration(url);
        await GameDB.updateDuration(gameId, duration);
    } else if (type === LinkType.SENSCRITIQUE) {
        const scRating = await SensCritique.getGameRating(url);
        if (scRating) {
            RatingDB.addRating(gameId, RatingType.SENSCRITIQUE, scRating);
        }
    } else if (type === LinkType.OPENCRITIC) {
        const ocGame = await OpenCritic.getGame(url);
        if (ocGame && ocGame.medianScore >= 0) {
            RatingDB.addRating(gameId, RatingType.OPENCRITIC, Math.round(ocGame.medianScore));
        }
    } else if (type === LinkType.METACRITIC) {
        const mcRating = await MetaCritic.getGameRating(url);
        if (mcRating) {
            RatingDB.addRating(gameId, RatingType.METACRITIC, mcRating);
        }
    } else if (type === LinkType.STEAM) {
        const steamRating = await Steam.getGameRating(url);
        if (steamRating) {
            RatingDB.addRating(gameId, RatingType.STEAM, steamRating);
        }
    } else if (type === LinkType.ITAD) {
        finalUrl = await ITAD.getIdFromSlug(url);
    }
    if (finalUrl) {
        LinkDB.addLink(gameId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

export async function PUT({ params, request, locals }: RequestEvent) {
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
            if (type === LinkType.IGDB) {
                const igdbGame = await IGDB.getGame(url);
                const date = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : undefined;
                await GameDB.updateDate(gameId, date);
                // TODO update platforms and Genres
            } else if (type === LinkType.HLTB) {
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
            } else if (type === LinkType.STEAM) {
                const steamRating = await Steam.getGameRating(url);
                if (steamRating) {
                    await RatingDB.updateRating(gameId, RatingType.STEAM, steamRating);
                }
            }
        }
    }
    return json({ success: true });
}