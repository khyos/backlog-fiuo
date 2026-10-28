import { describe, expect, test, beforeAll, beforeEach, afterAll } from 'vitest';
import { getDbRows, runDbQuery, runDbQueries } from '#lib/server/database';
import { TierListDB } from '#lib/server/model/TierListDB';
import { UserDB } from '#lib/server/model/UserDB';
import { ArtifactDB } from '#lib/server/model/ArtifactDB';
import { ArtifactType } from '#lib/model/Artifact';
import { computeTargetPosition } from '../../../../tierlist/[slug]/components/dnd';

/**
 * Integration tests for the within-tier reorder fix: the CLIENT drop-position
 * computation (`computeTargetPosition`, the core of handleDrop) feeding the
 * REAL server `moveItem` against a live SQLite DB.
 *
 * The original bug was an off-by-one: for a same-tier drag the client sent the
 * pre-removal index, so items landed one slot away from where they were dropped.
 * These tests drive the full pipeline (simulate a drop -> compute index ->
 * moveItem -> read back) and assert the VISUAL order matches the drop intent and
 * stays contiguous. Cross-tier moves are included to prove no regression.
 */

const ART = [930001, 930002, 930003, 930004, 930005];

async function insertArtifacts(ids: number[]) {
    for (const id of ids) {
        await runDbQuery(
            `INSERT INTO artifact (id, title, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`,
            [id, `Artifact ${id}`, ArtifactType.GAME, '2020-01-01', 60]
        );
    }
}

async function orderOf(tierListId: number, tierId: number | null): Promise<number[]> {
    const clause = tierId === null ? 'tierId IS NULL' : 'tierId = ?';
    const params = tierId === null ? [tierListId] : [tierListId, tierId];
    const rows = await getDbRows<{ artifactId: number; position: number }>(
        `SELECT artifactId, position FROM tier_list_item WHERE tierListId = ? AND ${clause} ORDER BY position ASC`,
        params
    );
    // Assert contiguity as a side-check on every read.
    expect(rows.map(r => r.position)).toEqual(rows.map((_, i) => i));
    return rows.map(r => r.artifactId);
}

/**
 * Simulate the user dropping `draggedId` onto an existing item's left/right half,
 * exactly as TierListItemComp wires the dropzone (horizontal, position = item.position).
 */
async function dropOnItem(
    tierListId: number,
    sourceTierId: number | null,
    targetTierId: number | null,
    draggedId: number,
    targetItemId: number,
    half: 'left' | 'right'
) {
    const sourceOrder = await orderOf(tierListId, sourceTierId);
    const targetOrder = await orderOf(tierListId, targetTierId);
    const sourceIndex = sourceOrder.indexOf(draggedId);
    const basePosition = targetOrder.indexOf(targetItemId);
    const targetPosition = computeTargetPosition({
        basePosition,
        horizontal: true,
        offsetX: half === 'right' ? 60 : 10,
        targetWidth: 80,
        sourceTierId,
        targetTierId,
        sourceIndex
    });
    await TierListDB.moveItem(tierListId, draggedId, targetTierId, targetPosition);
}

/**
 * Simulate dropping onto the container (TierRow / UnrankedPool): non-horizontal,
 * position = items.length.
 */
async function dropOnContainer(
    tierListId: number,
    sourceTierId: number | null,
    targetTierId: number | null,
    draggedId: number
) {
    const sourceOrder = await orderOf(tierListId, sourceTierId);
    const targetOrder = await orderOf(tierListId, targetTierId);
    const sourceIndex = sourceOrder.indexOf(draggedId);
    const targetPosition = computeTargetPosition({
        basePosition: targetOrder.length,
        horizontal: false,
        offsetX: 0,
        targetWidth: 0,
        sourceTierId,
        targetTierId,
        sourceIndex
    });
    await TierListDB.moveItem(tierListId, draggedId, targetTierId, targetPosition);
}

describe('move pipeline integration (computeTargetPosition + moveItem, live DB)', () => {
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

        await UserDB.signUp('tl_move_integration_owner', 'password123');
        ownerId = (await UserDB.getByUsername('tl_move_integration_owner'))!.id;

        await insertArtifacts(ART);
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);
        await runDbQueries([
            { query: 'DELETE FROM user WHERE username IN ("tl_move_integration_owner")' }
        ]);
    });

    async function seed(): Promise<{ tierListId: number; tierA: number; tierB: number }> {
        const tierListId = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'List');
        const tierA = await TierListDB.insertTier(tierListId, 'A', '#fff', 0);
        const tierB = await TierListDB.insertTier(tierListId, 'B', '#000', 1);
        return { tierListId, tierA, tierB };
    }

    async function fillTier(tierListId: number, tierId: number | null, ids: number[]) {
        for (let i = 0; i < ids.length; i++) {
            await TierListDB.insertItem(tierListId, ids[i], tierId, i);
        }
    }

    describe('same-tier drag lands exactly where it is dropped (off-by-one regression)', () => {
        test('dropping an item on the LEFT half of a later item inserts before it', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2], ART[3]]);

            // Drag ART[0] (index 0) onto the left half of ART[2] (index 2).
            await dropOnItem(tierListId, tierA, tierA, ART[0], ART[2], 'left');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[1], ART[0], ART[2], ART[3]]);
        });

        test('dropping an item on the RIGHT half of a later item inserts after it', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2], ART[3]]);

            // Drag ART[0] (index 0) onto the right half of ART[2] (index 2) -> after ART[2].
            await dropOnItem(tierListId, tierA, tierA, ART[0], ART[2], 'right');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[1], ART[2], ART[0], ART[3]]);
        });

        test('dragging an item one slot forward onto the next item left half is a no-op', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2], ART[3]]);

            // Classic off-by-one: ART[1] (index 1) dropped on left half of ART[2] (index 2)
            // must leave the order unchanged, not swap them.
            await dropOnItem(tierListId, tierA, tierA, ART[1], ART[2], 'left');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[0], ART[1], ART[2], ART[3]]);
        });

        test('dropping an item on its own right half is a stable no-op', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2]]);

            await dropOnItem(tierListId, tierA, tierA, ART[1], ART[1], 'right');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[0], ART[1], ART[2]]);
        });

        test('dragging a later item backward onto an earlier item lands before it', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2], ART[3]]);

            // Drag ART[3] (index 3) onto left half of ART[1] (index 1).
            await dropOnItem(tierListId, tierA, tierA, ART[3], ART[1], 'left');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[0], ART[3], ART[1], ART[2]]);
        });

        test('a multi-step reorder sequence stays contiguous and correct', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2], ART[3], ART[4]]);

            await dropOnItem(tierListId, tierA, tierA, ART[4], ART[0], 'left');   // [4,0,1,2,3]
            expect(await orderOf(tierListId, tierA)).toEqual([ART[4], ART[0], ART[1], ART[2], ART[3]]);

            await dropOnItem(tierListId, tierA, tierA, ART[0], ART[3], 'right');  // [4,1,2,3,0]
            expect(await orderOf(tierListId, tierA)).toEqual([ART[4], ART[1], ART[2], ART[3], ART[0]]);

            await dropOnContainer(tierListId, tierA, tierA, ART[4]);             // [1,2,3,0,4]
            expect(await orderOf(tierListId, tierA)).toEqual([ART[1], ART[2], ART[3], ART[0], ART[4]]);
        });
    });

    describe('same-tier container append', () => {
        test('dropping on the container sends the item to the end', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1], ART[2]]);

            await dropOnContainer(tierListId, tierA, tierA, ART[0]);

            expect(await orderOf(tierListId, tierA)).toEqual([ART[1], ART[2], ART[0]]);
        });
    });

    describe('cross-tier moves (no regression)', () => {
        test('dropping onto an item in another tier inserts there without a decrement', async () => {
            const { tierListId, tierA, tierB } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1]]);
            await fillTier(tierListId, tierB, [ART[2], ART[3]]);

            // Drag ART[0] from tierA onto the left half of ART[3] (index 1) in tierB.
            await dropOnItem(tierListId, tierA, tierB, ART[0], ART[3], 'left');

            expect(await orderOf(tierListId, tierA)).toEqual([ART[1]]);
            expect(await orderOf(tierListId, tierB)).toEqual([ART[2], ART[0], ART[3]]);
        });

        test('dropping onto another tier container appends to its end', async () => {
            const { tierListId, tierA, tierB } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1]]);
            await fillTier(tierListId, tierB, [ART[2]]);

            await dropOnContainer(tierListId, tierA, tierB, ART[1]);

            expect(await orderOf(tierListId, tierA)).toEqual([ART[0]]);
            expect(await orderOf(tierListId, tierB)).toEqual([ART[2], ART[1]]);
        });

        test('moving from a tier into the Unranked pool (null) appends there', async () => {
            const { tierListId, tierA } = await seed();
            await fillTier(tierListId, tierA, [ART[0], ART[1]]);
            await fillTier(tierListId, null, [ART[2]]);

            await dropOnContainer(tierListId, tierA, null, ART[0]);

            expect(await orderOf(tierListId, tierA)).toEqual([ART[1]]);
            expect(await orderOf(tierListId, null)).toEqual([ART[2], ART[0]]);
        });
    });

    describe('Unranked pool same-pool reorder (both tiers null)', () => {
        test('right-half drop within the pool lands after the hovered item', async () => {
            const { tierListId } = await seed();
            await fillTier(tierListId, null, [ART[0], ART[1], ART[2], ART[3]]);

            await dropOnItem(tierListId, null, null, ART[0], ART[2], 'right');

            expect(await orderOf(tierListId, null)).toEqual([ART[1], ART[2], ART[0], ART[3]]);
        });
    });
});
