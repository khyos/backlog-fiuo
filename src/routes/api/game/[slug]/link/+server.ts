import { HLTB } from "$lib/hltb/HLTB";
import { IGDB, IGDB_STATUS, IGDB_RELEASE_DATE_STATUS } from "$lib/igdb/IGDB";
import { ITAD } from "$lib/itad/ITAD";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { LinkType } from "$lib/model/Link";
import { RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { RatingDB } from "$lib/server/model/RatingDB";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { Steam } from "$lib/steam/Steam";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const gameId = parseInt(params.slug);
    const { type, url } = await request.json();
    
    const finalUrl = await setLinkInfo(gameId, type, url);
    if (finalUrl) {
        LinkDB.addLink(gameId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

export async function PATCH({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const gameId = parseInt(params.slug);
    const { type, url } = await request.json();

    const finalUrl = await setLinkInfo(gameId, type, url);
    if (finalUrl) {
        LinkDB.updateLink(gameId, type, finalUrl);
        return json({ success: true });
    }
    return error(404, "Not Valid URL");
}

const setLinkInfo = async (gameId: number, type: LinkType, url: string): Promise<string> => {
    let finalUrl = url;
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
    } else if (type === LinkType.STEAM) {
        const steamRating = await Steam.getGameRating(url);
        if (steamRating) {
            await RatingDB.addRating(gameId, RatingType.STEAM, steamRating);
        }
    } else if (type === LinkType.ITAD) {
        finalUrl = await ITAD.getIdFromSlug(url);
        if (finalUrl) {
            const [subscriptions, allServices] = await Promise.all([
                ITAD.getSubscriptions([finalUrl]),
                SubscriptionServiceDB.getAllServices()
            ]);
            const serviceNames = subscriptions[0]?.subs.map(s => s.name) ?? [];
            await SubscriptionServiceDB.syncArtifactSubscriptions(gameId, serviceNames, allServices);
        }
    }
    return finalUrl;
}

export async function PUT({ params, request, locals }: RequestEvent) {
    const user = User.deserialize(locals.user);
    if (!user.hasRight(UserRights.EDIT_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const gameId = parseInt(params.slug);
    const { types } = await request.json();
    const links = await LinkDB.getLinks(gameId);
    for (const type of types) {
        const url = links.find(link => link.type === type)?.url;
        if (url) {
            if (type === LinkType.IGDB) {
                try {
                    const igdbGame = await IGDB.getGame(url);
                    const date = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : undefined;
                    const status = igdbGame.status !== undefined ? IGDB_STATUS[igdbGame.status] : undefined;
                    await GameDB.updateGame(gameId, igdbGame.name, date, status);
                    await GameDB.updateAssignedGenres(gameId, igdbGame.genres);
                    await GameDB.updatePlatforms(gameId, igdbGame.platforms);
                    if (igdbGame.release_dates?.length) {
                        const releaseDates = igdbGame.release_dates
                            .filter(rd => rd.date !== undefined)
                            .map(rd => ({
                                platformId: rd.platform,
                                releaseDate: rd.date ?? 0,
                                status: rd.status !== undefined ? IGDB_RELEASE_DATE_STATUS[rd.status] : undefined
                            }));
                        await GameDB.updateReleaseDates(gameId, releaseDates);
                    }
                } catch {
                    return error(500, "Failed to Update IGDB");
                }
            } else if (type === LinkType.HLTB) {
                try {
                    const duration = await HLTB.getGameDuration(url);
                    await GameDB.updateDuration(gameId, duration);
                } catch {
                    return error(500, "Failed to Update HLTB");
                }
            } else if (type === LinkType.OPENCRITIC) {
                try {
                    const ocGame = await OpenCritic.getGame(url);
                    if (ocGame && ocGame.medianScore >= 0) {
                        await RatingDB.updateRating(gameId, RatingType.OPENCRITIC, Math.round(ocGame.medianScore));
                    }
                } catch {
                    return error(500, "Failed to Update OPENCRITIC");
                }
            } else if (type === LinkType.SENSCRITIQUE) {
                try {
                    const scRating = await SensCritique.getGameRating(url);
                    if (scRating) {
                        await RatingDB.updateRating(gameId, RatingType.SENSCRITIQUE, scRating);
                    }
                } catch {
                    return error(500, "Failed to Update SENSCRITIQUE");
                }
            } else if (type === LinkType.METACRITIC) {
                try {
                    const mcRating = await MetaCritic.getGameRating(url);
                    if (mcRating) {
                        await RatingDB.updateRating(gameId, RatingType.METACRITIC, mcRating);
                    }
                } catch {
                    return error(500, "Failed to Update METACRITIC");
                }
            } else if (type === LinkType.STEAM) {
                /*
                try {
                    const steamRating = await Steam.getGameRating(url);
                    if (steamRating) {
                        await RatingDB.updateRating(gameId, RatingType.STEAM, steamRating);
                    }
                } catch {
                    return error(500, "Failed to Update STEAM");
                }
                */
            } else if (type === LinkType.ITAD) {
                try {
                    const [subscriptions, allServices] = await Promise.all([
                        ITAD.getSubscriptions([url]),
                        SubscriptionServiceDB.getAllServices()
                    ]);
                    const serviceNames = subscriptions[0]?.subs.map(s => s.name) ?? [];
                    await SubscriptionServiceDB.syncArtifactSubscriptions(gameId, serviceNames, allServices);
                } catch {
                    return error(500, "Failed to Update ITAD subscriptions");
                }
            }
        }
    }
    return json({ success: true });
}
