import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'vitest';
import { getDbRows, runDbQuery, runDbQueries } from '../database';
import { TierListDB } from './TierListDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '#lib/model/Artifact';
import { User, UserRole } from '#lib/model/User';

/**
 * Standards tests for TierListDB (live in-memory-style shared SQLite DB).
 *
 * These read the implementation and exercise paths the pure contract tests cannot:
 *   - moveItem 2-D renumber (within tier, across tiers, to/from the null unranked pool)
 *   - replaceTiers + removeTier (removed tiers UNRANK their items instead of deleting them)
 *   - addUnrankedItems position appending + empty-array no-op
 *   - getItemArtifactIds, deleteTierList cascade, canEditTierList authorization matrix
 *   - getTierListByIdWithItems grouping / ordering / unranked separation
 */

const ART = [910001, 910002, 910003, 910004, 910005, 910006];

async function insertArtifacts(ids: number[]) {
    for (const id of ids) {
        await runDbQuery(
            `INSERT INTO artifact (id, title, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`,
            [id, `Artifact ${id}`, ArtifactType.GAME, '2020-01-01', 60]
        );
    }
}

async function readPositions(tierListId: number, tierId: number | null): Promise<{ artifactId: number; position: number }[]> {
    const clause = tierId === null ? 'tierId IS NULL' : 'tierId = ?';
    const params = tierId === null ? [tierListId] : [tierListId, tierId];
    return getDbRows<{ artifactId: number; position: number }>(
        `SELECT artifactId, position FROM tier_list_item WHERE tierListId = ? AND ${clause} ORDER BY position ASC`,
        params
    );
}

function expectContiguous(rows: { position: number }[]) {
    expect(rows.map(r => r.position)).toEqual(rows.map((_, i) => i));
}

describe('TierListDB (live DB)', () => {
    let ownerId: number;
    let otherId: number;

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

        await UserDB.signUp('tl_owner', 'password123');
        await UserDB.signUp('tl_other', 'password123');
        ownerId = (await UserDB.getByUsername('tl_owner'))!.id;
        otherId = (await UserDB.getByUsername('tl_other'))!.id;

        await insertArtifacts(ART);
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);
        await runDbQueries([
            { query: 'DELETE FROM user WHERE username IN ("tl_owner", "tl_other")' }
        ]);
    });

    async function seedList(): Promise<{ tierListId: number; tierA: number; tierB: number }> {
        const tierListId = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'List');
        const tierA = await TierListDB.insertTier(tierListId, 'A', '#fff', 0);
        const tierB = await TierListDB.insertTier(tierListId, 'B', '#eee', 1);
        return { tierListId, tierA, tierB };
    }

    describe('moveItem renumbering', () => {
        test('moving within a tier to a higher index keeps positions contiguous with item at target', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);
            await TierListDB.insertItem(tierListId, ART[3], tierA, 3);

            await TierListDB.moveItem(tierListId, ART[0], tierA, 2);

            const rows = await readPositions(tierListId, tierA);
            expectContiguous(rows);
            expect(rows.find(r => r.artifactId === ART[0])!.position).toBe(2);
            expect(rows.map(r => r.artifactId)).toEqual([ART[1], ART[2], ART[0], ART[3]]);
        });

        test('moving within a tier to a lower index keeps positions contiguous', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);
            await TierListDB.insertItem(tierListId, ART[3], tierA, 3);

            await TierListDB.moveItem(tierListId, ART[3], tierA, 1);

            const rows = await readPositions(tierListId, tierA);
            expectContiguous(rows);
            expect(rows.find(r => r.artifactId === ART[3])!.position).toBe(1);
            expect(rows.map(r => r.artifactId)).toEqual([ART[0], ART[3], ART[1], ART[2]]);
        });

        test('moving across tiers closes the gap in source and opens a slot in target', async () => {
            const { tierListId, tierA, tierB } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);
            await TierListDB.insertItem(tierListId, ART[3], tierB, 0);
            await TierListDB.insertItem(tierListId, ART[4], tierB, 1);

            await TierListDB.moveItem(tierListId, ART[1], tierB, 1);

            const sourceRows = await readPositions(tierListId, tierA);
            const targetRows = await readPositions(tierListId, tierB);
            expectContiguous(sourceRows);
            expectContiguous(targetRows);
            expect(sourceRows.map(r => r.artifactId)).toEqual([ART[0], ART[2]]);
            expect(targetRows.map(r => r.artifactId)).toEqual([ART[3], ART[1], ART[4]]);
        });

        test('moving a ranked item to the unranked pool (tierId null) is null-safe and contiguous', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], null, 0);

            await TierListDB.moveItem(tierListId, ART[0], null, 0);

            const tierRows = await readPositions(tierListId, tierA);
            const unranked = await readPositions(tierListId, null);
            expectContiguous(tierRows);
            expectContiguous(unranked);
            expect(tierRows.map(r => r.artifactId)).toEqual([ART[1]]);
            expect(unranked.map(r => r.artifactId)).toEqual([ART[0], ART[2]]);
        });

        test('moving an unranked item into a tier is null-safe on the source side', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 0);
            await TierListDB.insertItem(tierListId, ART[2], null, 1);

            await TierListDB.moveItem(tierListId, ART[1], tierA, 0);

            const tierRows = await readPositions(tierListId, tierA);
            const unranked = await readPositions(tierListId, null);
            expectContiguous(tierRows);
            expectContiguous(unranked);
            expect(tierRows.map(r => r.artifactId)).toEqual([ART[1], ART[0]]);
            expect(unranked.map(r => r.artifactId)).toEqual([ART[2]]);
        });

        test('moving a non-existent item is a no-op (early return on missing row)', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await expect(TierListDB.moveItem(tierListId, 999999, tierA, 0)).resolves.toBeUndefined();
            const rows = await readPositions(tierListId, tierA);
            expect(rows.map(r => r.artifactId)).toEqual([ART[0]]);
        });
    });

    describe('replaceTiers / removeTier', () => {
        test('removing a tier reassigns its items to the unranked pool instead of deleting them', async () => {
            const { tierListId, tierA, tierB } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0); // existing unranked
            await TierListDB.insertItem(tierListId, ART[1], tierB, 0);
            await TierListDB.insertItem(tierListId, ART[2], tierB, 1);

            // Keep only tierA (tierB dropped from payload => removed).
            await TierListDB.replaceTiers(tierListId, [{ id: tierA, label: 'A', color: '#fff', position: 0 }]);

            const remainingTiers = await getDbRows<{ id: number }>(`SELECT id FROM tier_list_tier WHERE tierListId = ?`, [tierListId]);
            expect(remainingTiers.map(t => t.id)).toEqual([tierA]);

            const unranked = await readPositions(tierListId, null);
            // Items are preserved (not deleted) and appended after the existing unranked item.
            expect(unranked.map(r => r.artifactId)).toEqual([ART[0], ART[1], ART[2]]);
            expectContiguous(unranked);

            // No item was lost.
            const all = await TierListDB.getItemArtifactIds(tierListId);
            expect(all.sort()).toEqual([ART[0], ART[1], ART[2]].sort());
        });

        test('updates persist label, color and position for kept tiers; new tiers are inserted', async () => {
            const { tierListId, tierA, tierB } = await seedList();
            await TierListDB.replaceTiers(tierListId, [
                { id: tierA, label: 'S', color: '#111', position: 1 },
                { id: tierB, label: 'B', color: '#222', position: 0 },
                { label: 'NEW', color: '#333', position: 2 }
            ]);

            const tiers = await getDbRows<{ id: number; label: string; color: string; position: number }>(
                `SELECT id, label, color, position FROM tier_list_tier WHERE tierListId = ? ORDER BY position ASC`,
                [tierListId]
            );
            expect(tiers.map(t => t.label)).toEqual(['B', 'S', 'NEW']);
            const renamed = tiers.find(t => t.id === tierA)!;
            expect(renamed.label).toBe('S');
            expect(renamed.color).toBe('#111');
            expect(renamed.position).toBe(1);
        });

        test('DB layer does NOT guard against removing every tier — all items get unranked (guard lives in the API endpoint)', async () => {
            const { tierListId, tierA, tierB } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierB, 0);

            await TierListDB.replaceTiers(tierListId, []);

            const tiers = await getDbRows<{ id: number }>(`SELECT id FROM tier_list_tier WHERE tierListId = ?`, [tierListId]);
            expect(tiers).toHaveLength(0);
            const unranked = await readPositions(tierListId, null);
            expect(unranked.map(r => r.artifactId).sort()).toEqual([ART[0], ART[1]].sort());
            expectContiguous(unranked);
        });
    });

    describe('addUnrankedItems', () => {
        test('appends after the current max unranked position', async () => {
            const { tierListId } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 1);

            await TierListDB.addUnrankedItems(tierListId, [ART[2], ART[3]]);

            const unranked = await readPositions(tierListId, null);
            expect(unranked.map(r => r.artifactId)).toEqual([ART[0], ART[1], ART[2], ART[3]]);
            expectContiguous(unranked);
        });

        test('starts at position 0 when there are no unranked items yet', async () => {
            const { tierListId } = await seedList();
            await TierListDB.addUnrankedItems(tierListId, [ART[0], ART[1]]);
            const unranked = await readPositions(tierListId, null);
            expect(unranked).toEqual([
                { artifactId: ART[0], position: 0 },
                { artifactId: ART[1], position: 1 }
            ]);
        });

        test('empty id array is a no-op', async () => {
            const { tierListId } = await seedList();
            await TierListDB.addUnrankedItems(tierListId, []);
            expect(await TierListDB.getItemArtifactIds(tierListId)).toEqual([]);
        });
    });

    describe('getItemArtifactIds', () => {
        test('returns every item artifact id across all tiers and the unranked pool', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 0);
            const ids = await TierListDB.getItemArtifactIds(tierListId);
            expect(ids.sort()).toEqual([ART[0], ART[1]].sort());
        });
    });

    describe('getTierListByIdWithItems', () => {
        test('groups items under their tier ordered by position and separates the unranked pool', async () => {
            const { tierListId, tierA, tierB } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[2], tierB, 0);
            await TierListDB.insertItem(tierListId, ART[3], null, 0);

            const list = (await TierListDB.getTierListByIdWithItems(tierListId))!;
            expect(list).not.toBeNull();
            expect(list.tiers.map(t => t.label)).toEqual(['A', 'B']);

            const a = list.tiers.find(t => t.id === tierA)!;
            expect(a.items.map(i => i.artifact.id)).toEqual([ART[1], ART[0]]); // sorted by position
            const b = list.tiers.find(t => t.id === tierB)!;
            expect(b.items.map(i => i.artifact.id)).toEqual([ART[2]]);
            expect(list.unranked.map(i => i.artifact.id)).toEqual([ART[3]]);
        });

        test('returns null for a non-existent tier list', async () => {
            expect(await TierListDB.getTierListByIdWithItems(987654)).toBeNull();
        });
    });

    describe('deleteTierList', () => {
        test('cascades to tiers and items', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);

            await TierListDB.deleteTierList(tierListId);

            expect(await TierListDB.getTierListById(tierListId)).toBeNull();
            expect(await TierListDB.getItemArtifactIds(tierListId)).toEqual([]);
            const tiers = await getDbRows(`SELECT * FROM tier_list_tier WHERE tierListId = ?`, [tierListId]);
            expect(tiers).toHaveLength(0);
        });
    });

    describe('canEditTierList authorization matrix', () => {
        test('owner with EDIT_BACKLOG right is allowed (200)', async () => {
            const { tierListId } = await seedList();
            const owner = new User(ownerId, 'tl_owner', UserRole.USER);
            const status = await TierListDB.canEditTierList(owner, tierListId);
            expect(status.status).toBe(200);
        });

        test('a user lacking EDIT_BACKLOG (guest) is denied (403) before any lookup', async () => {
            const { tierListId } = await seedList();
            const guest = new User(ownerId, 'tl_owner', UserRole.GUEST);
            const status = await TierListDB.canEditTierList(guest, tierListId);
            expect(status.status).toBe(403);
        });

        test('a non-owner with edit rights is denied (403)', async () => {
            const { tierListId } = await seedList();
            const other = new User(otherId, 'tl_other', UserRole.USER);
            const status = await TierListDB.canEditTierList(other, tierListId);
            expect(status.status).toBe(403);
        });

        test('anonymous (deserialized null -> guest id -1) is denied (403)', async () => {
            const { tierListId } = await seedList();
            const anon = User.deserialize(null);
            const status = await TierListDB.canEditTierList(anon, tierListId);
            expect(status.status).toBe(403);
        });

        test('missing tier list returns 404 when the user has edit rights', async () => {
            const owner = new User(ownerId, 'tl_owner', UserRole.USER);
            const status = await TierListDB.canEditTierList(owner, 987654);
            expect(status.status).toBe(404);
        });
    });
});
