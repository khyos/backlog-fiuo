import { describe, expect, test, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { getDbRows, runDbQuery, runDbQueries } from '../database';
import { TierListUtil, DEFAULT_TIERS } from './TierListUtil';
import { TierListDB } from './TierListDB';
import { BacklogDB } from './BacklogDB';
import { ArtifactDB } from './ArtifactDB';
import { UserDB } from './UserDB';
import { ArtifactType } from '#lib/model/Artifact';
import { User, UserRole } from '#lib/model/User';

/**
 * Standards tests for TierListUtil's DB-backed orchestration (live tier_list tables,
 * with BacklogDB / ArtifactDB mocked at the boundary so backlog membership and the
 * backlog owner's scores can be controlled precisely).
 *
 * Covers the gaps the contract tester explicitly could not reach:
 *   - createTierListFromBacklog seeding: null score -> unranked; rated -> matching band;
 *     scores come from the BACKLOG OWNER (not the acting user)
 *   - refreshFromBacklog reconciliation against a live DB: added land unranked,
 *     removalCandidates are NOT deleted, intersection keeps tierId/position,
 *     deleted/empty/null backlog -> everything is a removal candidate
 *   - loadTierListPageInfo canEdit computation
 */

const ART = [920001, 920002, 920003, 920004, 920005];

function fakeBacklog(id: number, userId: number, artifactIds: number[]) {
    return {
        id,
        userId,
        artifactType: ArtifactType.GAME,
        title: 'Backlog',
        backlogItems: artifactIds.map(aid => ({
            artifact: { id: aid, title: `Artifact ${aid}`, type: ArtifactType.GAME }
        }))
    } as never;
}

async function insertArtifacts(ids: number[]) {
    for (const id of ids) {
        await runDbQuery(
            `INSERT INTO artifact (id, title, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`,
            [id, `Artifact ${id}`, ArtifactType.GAME, '2020-01-01', 60]
        );
    }
}

async function itemRows(tierListId: number) {
    return getDbRows<{ artifactId: number; tierId: number | null; position: number }>(
        `SELECT artifactId, tierId, position FROM tier_list_item WHERE tierListId = ? ORDER BY position ASC`,
        [tierListId]
    );
}

describe('TierListUtil DB orchestration (live DB, boundaries mocked)', () => {
    let ownerId: number;

    const cleanTierTables = async () => {
        await runDbQueries([
            { query: 'DELETE FROM tier_list_item' },
            { query: 'DELETE FROM tier_list_tier' },
            { query: 'DELETE FROM tier_list' },
            { query: 'DELETE FROM sqlite_sequence WHERE name IN ("tier_list", "tier_list_tier")' }
        ]);
    };

    beforeAll(async () => {
        await UserDB.createUserTable();
        await ArtifactDB.createArtifactTable();
        await TierListDB.createTierListTable();
        await TierListDB.createTierListTierTable();
        await TierListDB.createTierListItemTable();
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);

        await UserDB.signUp('tlu_owner', 'password123');
        ownerId = (await UserDB.getByUsername('tlu_owner'))!.id;
        await insertArtifacts(ART);
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);
        await runDbQueries([{ query: 'DELETE FROM user WHERE username = "tlu_owner"' }]);
    });

    describe('createTierListFromBacklog seeding', () => {
        test('seeds rated items into their score band, null-score items into the unranked pool, using the backlog OWNER score', async () => {
            const BACKLOG_ID = 55;
            const OWNER_SCORE_USERID = 777; // distinct from the acting user, proves owner scores are used
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(
                fakeBacklog(BACKLOG_ID, OWNER_SCORE_USERID, [ART[0], ART[1], ART[2]])
            );
            const getUserInfos = vi.spyOn(ArtifactDB, 'getUserInfos').mockResolvedValue([
                { artifactId: ART[0], score: 95 },   // -> tier index 0 (S)
                { artifactId: ART[1], score: 72 }    // -> tier index 2 (B)
                // ART[2] intentionally missing -> null score -> unranked
            ] as never);

            const actingUser = new User(ownerId, 'tlu_owner', UserRole.USER);
            const tierListId = (await TierListUtil.createTierListFromBacklog(actingUser, BACKLOG_ID))!;
            expect(tierListId).not.toBeNull();

            // Scores must be fetched for the backlog owner, not the acting user.
            expect(getUserInfos).toHaveBeenCalledWith(OWNER_SCORE_USERID, expect.arrayContaining([ART[0], ART[1], ART[2]]));

            const list = (await TierListDB.getTierListByIdWithItems(tierListId))!;
            expect(list.tiers).toHaveLength(DEFAULT_TIERS.length);
            expect(list.userId).toBe(ownerId); // acting user owns the created list

            const sTier = list.tiers.find(t => t.label === 'S')!;
            const bTier = list.tiers.find(t => t.label === 'B')!;
            expect(sTier.items.map(i => i.artifact.id)).toEqual([ART[0]]);
            expect(bTier.items.map(i => i.artifact.id)).toEqual([ART[1]]);
            expect(list.unranked.map(i => i.artifact.id)).toEqual([ART[2]]);
        });

        test('multiple items in the same band get sequential positions', async () => {
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(fakeBacklog(56, ownerId, [ART[0], ART[1], ART[2]]));
            vi.spyOn(ArtifactDB, 'getUserInfos').mockResolvedValue([
                { artifactId: ART[0], score: 91 },
                { artifactId: ART[1], score: 90 },
                { artifactId: ART[2], score: 99 }
            ] as never);

            const tierListId = (await TierListUtil.createTierListFromBacklog(new User(ownerId, 'tlu_owner', UserRole.USER), 56))!;
            const list = (await TierListDB.getTierListByIdWithItems(tierListId))!;
            const sTier = list.tiers.find(t => t.label === 'S')!;
            expect(sTier.items.map(i => i.position)).toEqual([0, 1, 2]);
            expect(sTier.items).toHaveLength(3);
            expect(list.unranked).toHaveLength(0);
        });

        test('returns null when the backlog does not exist', async () => {
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(null);
            const result = await TierListUtil.createTierListFromBacklog(new User(ownerId, 'tlu_owner', UserRole.USER), 999);
            expect(result).toBeNull();
        });
    });

    describe('refreshFromBacklog reconciliation (live DB)', () => {
        async function seedListWithBacklog(backlogId: number | null) {
            const tierListId = await TierListDB.insertTierList(ownerId, backlogId, ArtifactType.GAME, 'List');
            const tierA = await TierListDB.insertTier(tierListId, 'A', '#fff', 0);
            // ART[0] ranked in tierA, ART[1] unranked already.
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 0);
            return { tierListId, tierA };
        }

        test('added items land in the unranked pool; intersection keeps tierId/position; removals are NOT deleted', async () => {
            const BACKLOG_ID = 61;
            const { tierListId, tierA } = await seedListWithBacklog(BACKLOG_ID);

            // Backlog now has ART[0] (kept, ranked), ART[2] & ART[3] (new). ART[1] dropped (removal candidate).
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(fakeBacklog(BACKLOG_ID, ownerId, [ART[0], ART[2], ART[3]]));
            const getArtifactById = vi.spyOn(ArtifactDB, 'getArtifactById').mockImplementation(
                async (id: number) => ({ id, title: `Artifact ${id}`, type: ArtifactType.GAME } as never)
            );

            const result = await TierListUtil.refreshFromBacklog(tierListId);

            expect(result.added.map(a => a.id).sort()).toEqual([ART[2], ART[3]].sort());
            expect(result.removalCandidates.map(a => a.id)).toEqual([ART[1]]);
            expect(getArtifactById).toHaveBeenCalledWith(ART[1]);

            const rows = await itemRows(tierListId);
            const byId = new Map(rows.map(r => [r.artifactId, r]));
            // Intersection kept exactly where it was.
            expect(byId.get(ART[0])).toMatchObject({ tierId: tierA, position: 0 });
            // Removal candidate still present (not deleted).
            expect(byId.has(ART[1])).toBe(true);
            // New items are unranked (tierId null).
            expect(byId.get(ART[2])!.tierId).toBeNull();
            expect(byId.get(ART[3])!.tierId).toBeNull();
        });

        test('deleted backlog -> every existing item is a removal candidate and nothing is added', async () => {
            const BACKLOG_ID = 62;
            const { tierListId } = await seedListWithBacklog(BACKLOG_ID);
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(null);
            vi.spyOn(ArtifactDB, 'getArtifactById').mockImplementation(
                async (id: number) => ({ id, title: `Artifact ${id}`, type: ArtifactType.GAME } as never)
            );

            const result = await TierListUtil.refreshFromBacklog(tierListId);

            expect(result.added).toEqual([]);
            expect(result.removalCandidates.map(a => a.id).sort()).toEqual([ART[0], ART[1]].sort());
            // Items are retained, not deleted.
            expect((await TierListDB.getItemArtifactIds(tierListId)).sort()).toEqual([ART[0], ART[1]].sort());
        });

        test('tier list with a null backlogId behaves like a missing backlog (no BacklogDB call)', async () => {
            const { tierListId } = await seedListWithBacklog(null);
            const getBacklog = vi.spyOn(BacklogDB, 'getBacklogByIdWithItems');
            vi.spyOn(ArtifactDB, 'getArtifactById').mockImplementation(
                async (id: number) => ({ id, title: `Artifact ${id}`, type: ArtifactType.GAME } as never)
            );

            const result = await TierListUtil.refreshFromBacklog(tierListId);

            expect(getBacklog).not.toHaveBeenCalled();
            expect(result.added).toEqual([]);
            expect(result.removalCandidates.map(a => a.id).sort()).toEqual([ART[0], ART[1]].sort());
        });

        test('a removal-candidate artifact missing from ArtifactDB is skipped', async () => {
            const BACKLOG_ID = 63;
            const { tierListId } = await seedListWithBacklog(BACKLOG_ID);
            vi.spyOn(BacklogDB, 'getBacklogByIdWithItems').mockResolvedValue(fakeBacklog(BACKLOG_ID, ownerId, [ART[0]]));
            // ART[1] is a removal candidate but getArtifactById returns null for it.
            vi.spyOn(ArtifactDB, 'getArtifactById').mockResolvedValue(null);

            const result = await TierListUtil.refreshFromBacklog(tierListId);
            expect(result.removalCandidates).toEqual([]);
        });

        test('missing tier list returns empty reconciliation', async () => {
            const result = await TierListUtil.refreshFromBacklog(987654);
            expect(result).toEqual({ added: [], removalCandidates: [] });
        });
    });

    describe('loadTierListPageInfo canEdit', () => {
        async function seedSimpleList() {
            const tierListId = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'List');
            await TierListDB.insertTier(tierListId, 'A', '#fff', 0);
            return tierListId;
        }

        test('owner with edit rights -> canEdit true', async () => {
            const tierListId = await seedSimpleList();
            const info = (await TierListUtil.loadTierListPageInfo(tierListId, { user: { id: ownerId, username: 'tlu_owner', role: UserRole.USER } } as never))!;
            expect(info.canEdit).toBe(true);
            expect(info.tierList.id).toBe(tierListId);
        });

        test('a different user -> canEdit false', async () => {
            const tierListId = await seedSimpleList();
            const info = (await TierListUtil.loadTierListPageInfo(tierListId, { user: { id: ownerId + 9999, username: 'x', role: UserRole.USER } } as never))!;
            expect(info.canEdit).toBe(false);
        });

        test('anonymous (no locals.user) -> canEdit false', async () => {
            const tierListId = await seedSimpleList();
            const info = (await TierListUtil.loadTierListPageInfo(tierListId, { user: null } as never))!;
            expect(info.canEdit).toBe(false);
        });

        test('missing tier list -> null', async () => {
            const info = await TierListUtil.loadTierListPageInfo(987654, { user: { id: ownerId, username: 'tlu_owner', role: UserRole.USER } } as never);
            expect(info).toBeNull();
        });
    });
});
