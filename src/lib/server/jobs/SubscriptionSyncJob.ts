import { ArtifactType } from "$lib/model/Artifact";
import { LinkType } from "$lib/model/Link";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { LinkDB } from "$lib/server/model/LinkDB";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { TMDB } from "$lib/tmdb/TMDB";

const BATCH_SIZE = 10;
const TICK_INTERVAL_MS = 10 * 1000;

// Phases processed in order each day
const PHASES: { type: ArtifactType; media: 'movie' | 'tv' }[] = [
    { type: ArtifactType.MOVIE, media: 'movie' },
    { type: ArtifactType.TVSHOW, media: 'tv' },
];

let started = false;

export function startSubscriptionSyncJob(): void {
    if (started) return;
    started = true;

    let phaseIndex = 0;
    let page = 0;

    async function tick(): Promise<void> {
        if (phaseIndex >= PHASES.length) {
            // All phases done — wait until midnight then restart
            scheduleNextDay();
            return;
        }

        const { type, media } = PHASES[phaseIndex];

        try {
            const artifacts = await ArtifactDB.getArtifacts(type, page, BATCH_SIZE);

            if (artifacts.length === 0) {
                // Phase exhausted — move to the next one
                phaseIndex++;
                page = 0;
                scheduleNextTick();
                return;
            }

            const artifactIds = artifacts.map(a => a.id);
            const idsMapping = await LinkDB.getLinksMultiple(LinkType.TMDB, artifactIds);
            const allServices = await SubscriptionServiceDB.getAllServices();

            const entries = artifactIds
                .filter(id => idsMapping[id])
                .map(id => ({ artifactId: id, tmdbId: idsMapping[id] }));

            if (entries.length > 0) {
                const providersMap = await TMDB.getWatchProviders(media, entries);
                await Promise.all(
                    Object.entries(providersMap)
                        .filter(([, providers]) => providers.length > 0)
                        .map(([artifactId, providers]) =>
                            SubscriptionServiceDB.syncArtifactSubscriptions(Number(artifactId), providers, allServices)
                        )
                );
            }

            page++;
        } catch (e) {
            console.error('[SubscriptionSyncJob] tick error:', e);
        }

        scheduleNextTick();
    }

    function scheduleNextTick(): void {
        setTimeout(() => { tick(); }, TICK_INTERVAL_MS);
    }

    function scheduleNextDay(): void {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        const msUntilMidnight = midnight.getTime() - now.getTime();
        console.log(`[SubscriptionSyncJob] all phases done, resuming in ${Math.round(msUntilMidnight / 60000)} minutes`);
        setTimeout(() => {
            phaseIndex = 0;
            page = 0;
            tick();
        }, msUntilMidnight);
    }

    // Kick off the first tick
    tick();
}
