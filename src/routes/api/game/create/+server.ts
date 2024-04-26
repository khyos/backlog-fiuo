import { HLTB } from "$lib/hltb/HLTB";
import { IGDB } from "$lib/igdb/IGDB";
import { MetaCritic } from "$lib/metacritic/MetaCritic";
import { Link, LinkType } from "$lib/model/Link";
import { Rating, RatingType } from "$lib/model/Rating";
import { User, UserRights } from "$lib/model/User";
import { OpenCritic } from "$lib/opencritic/OpenCritic";
import { SensCritique } from "$lib/senscritique/SensCritique";
import { LinkDB } from "$lib/server/model/LinkDB";
import { GameDB } from "$lib/server/model/game/GameDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ request, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (!userInst.hasRight(UserRights.CREATE_ARTIFACT)) {
        return error(403, "Forbidden");
    }
    const { igdbId, hltbId, scId, ocId, mcId } = await request.json();
    if (!igdbId) {
        error(500, 'No IGDB ID provided');
    }
    const alreadyExists = await LinkDB.exists(LinkType.IGDB, igdbId);
    if (alreadyExists) {
        error(500, 'Game already exists in list');
    }
    const igdbGame = await IGDB.getGame(igdbId);
    const links: Link[] = [];
    const ratings: Rating[] = [];

    links.push(new Link(LinkType.IGDB, igdbId));

    let duration = 0;
    if (hltbId) {
        duration = await HLTB.getGameDuration(hltbId);
        links.push(new Link(LinkType.HLTB, hltbId));
    }

    if (scId) {
        links.push(new Link(LinkType.SENSCRITIQUE, scId));
        const scRating = await SensCritique.getGameRating(scId);
        if (scRating) {
            ratings.push(new Rating(RatingType.SENSCRITIQUE, scRating));
        }
    }

    if (ocId) {
        links.push(new Link(LinkType.OPENCRITIC, ocId));
        const ocGame = await OpenCritic.getGame(ocId);
        if (ocGame && ocGame.medianScore >= 0) {
            ratings.push(new Rating(RatingType.OPENCRITIC, Math.round(ocGame.medianScore)));
        }
    }

    if (mcId) {
        links.push(new Link(LinkType.METACRITIC, mcId));
        const mcRating = await MetaCritic.getGameRating(mcId);
        if (mcRating) {
            ratings.push(new Rating(RatingType.METACRITIC, mcRating));
        }
    }

    const game = await GameDB.createGame(igdbGame.name, new Date(igdbGame.first_release_date * 1000), duration, igdbGame.platforms || [], igdbGame.genres || [], links, ratings);
    if (game) {
        return json(game.serialize());
    } else {
        return error(500, 'Failed to create Game');
    }
}
