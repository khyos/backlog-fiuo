import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'vitest';
import { getDbRows, runDbQuery, runDbQueries } from '../database';
import { TierListDB } from './TierListDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '#lib/model/Artifact';

/**
 * Contract tests for the within-tier / within-pool reorder bug-fix.
 *
 * Public contract of `moveItem(tierListId, artifactId, targetTierId, targetPosition)`:
 *   - `targetPosition` is the final zero-based index the moved item occupies within the
 *     target tier/pool, measured AFTER the moved item has been removed from its source.
 *   - `targetTierId === null` addresses the Unranked pool.
 *   - After ANY move, positions within every affected tier/pool are contiguous 0..n-1
 *     (no gaps, no duplicates).
 *   - Moving within the same tier/pool to a higher post-removal index and to a lower
 *     post-removal index must both land the item at exactly the requested index.
 *   - Items load ordered by position ascending within each tier/pool.
 *
 * These tests deliberately strengthen coverage of:
 *   - Unranked pool (tierId null) same-pool reorder in BOTH directions.
 *   - The end/append case (targetPosition === post-removal length - 1) staying contiguous.
 *
 * They are written from the contract only and do not read moveItem's implementation.
 */

const ART = [920001, 920002, 920003, 920004, 920005];

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

describe('TierListDB.moveItem reorder contract (within tier / within pool)', () => {
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

        await UserDB.signUp('tl_reorder_owner', 'password123');
        ownerId = (await UserDB.getByUsername('tl_reorder_owner'))!.id;

        await insertArtifacts(ART);
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);
        await runDbQueries([
            { query: 'DELETE FROM user WHERE username IN ("tl_reorder_owner")' }
        ]);
    });

    async function seedList(): Promise<{ tierListId: number; tierA: number }> {
        const tierListId = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'List');
        const tierA = await TierListDB.insertTier(tierListId, 'A', '#fff', 0);
        return { tierListId, tierA };
    }

    describe('same tier reorder', () => {
        test('moving toward the end to the final post-removal index appends and stays contiguous', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);
            await TierListDB.insertItem(tierListId, ART[3], tierA, 3);

            // Remove ART[0] -> [1,2,3], insert at post-removal index 3 (the end).
            await TierListDB.moveItem(tierListId, ART[0], tierA, 3);

            const rows = await readPositions(tierListId, tierA);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[1], ART[2], ART[3], ART[0]]);
            expect(rows.find(r => r.artifactId === ART[0])!.position).toBe(3);
        });

        test('moving toward the front to post-removal index 0 lands first and stays contiguous', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);
            await TierListDB.insertItem(tierListId, ART[3], tierA, 3);

            // Remove ART[3] -> [0,1,2], insert at post-removal index 0 (the front).
            await TierListDB.moveItem(tierListId, ART[3], tierA, 0);

            const rows = await readPositions(tierListId, tierA);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[3], ART[0], ART[1], ART[2]]);
            expect(rows.find(r => r.artifactId === ART[3])!.position).toBe(0);
        });

        test('moving to the same post-removal index it already occupies is a stable no-op', async () => {
            const { tierListId, tierA } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], tierA, 0);
            await TierListDB.insertItem(tierListId, ART[1], tierA, 1);
            await TierListDB.insertItem(tierListId, ART[2], tierA, 2);

            // ART[1] sits at index 1; after removal [0,2], reinserting at index 1 restores order.
            await TierListDB.moveItem(tierListId, ART[1], tierA, 1);

            const rows = await readPositions(tierListId, tierA);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[0], ART[1], ART[2]]);
        });
    });

    describe('unranked pool (tierId null) same-pool reorder', () => {
        test('moving an unranked item toward a higher post-removal index lands exactly there', async () => {
            const { tierListId } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 1);
            await TierListDB.insertItem(tierListId, ART[2], null, 2);
            await TierListDB.insertItem(tierListId, ART[3], null, 3);

            // Remove ART[0] -> [1,2,3], insert at post-removal index 2.
            await TierListDB.moveItem(tierListId, ART[0], null, 2);

            const rows = await readPositions(tierListId, null);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[1], ART[2], ART[0], ART[3]]);
            expect(rows.find(r => r.artifactId === ART[0])!.position).toBe(2);
        });

        test('moving an unranked item toward a lower post-removal index lands exactly there', async () => {
            const { tierListId } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 1);
            await TierListDB.insertItem(tierListId, ART[2], null, 2);
            await TierListDB.insertItem(tierListId, ART[3], null, 3);

            // Remove ART[3] -> [0,1,2], insert at post-removal index 1.
            await TierListDB.moveItem(tierListId, ART[3], null, 1);

            const rows = await readPositions(tierListId, null);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[0], ART[3], ART[1], ART[2]]);
            expect(rows.find(r => r.artifactId === ART[3])!.position).toBe(1);
        });

        test('moving an unranked item to the final post-removal index appends and stays contiguous', async () => {
            const { tierListId } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 1);
            await TierListDB.insertItem(tierListId, ART[2], null, 2);

            // Remove ART[0] -> [1,2], insert at post-removal index 2 (the end).
            await TierListDB.moveItem(tierListId, ART[0], null, 2);

            const rows = await readPositions(tierListId, null);
            expectContiguous(rows);
            expect(rows.map(r => r.artifactId)).toEqual([ART[1], ART[2], ART[0]]);
            expect(rows.find(r => r.artifactId === ART[0])!.position).toBe(2);
        });
    });

    describe('ordering invariant via the loader', () => {
        test('getTierListByIdWithItems returns the unranked pool ordered by position after a reorder', async () => {
            const { tierListId } = await seedList();
            await TierListDB.insertItem(tierListId, ART[0], null, 0);
            await TierListDB.insertItem(tierListId, ART[1], null, 1);
            await TierListDB.insertItem(tierListId, ART[2], null, 2);

            await TierListDB.moveItem(tierListId, ART[2], null, 0);

            const list = (await TierListDB.getTierListByIdWithItems(tierListId))!;
            expect(list).not.toBeNull();
            expect(list.unranked.map(i => i.artifact.id)).toEqual([ART[2], ART[0], ART[1]]);
        });
    });
});
