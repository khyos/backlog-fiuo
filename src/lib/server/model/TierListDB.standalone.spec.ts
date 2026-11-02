import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { runDbQuery, runDbQueries } from '../database';
import { TierListDB } from './TierListDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '#lib/model/Artifact';

/**
 * Contract: TierListDB.unlinkFromBacklog(id)
 * - Sets the tier list with the given ID to standalone: isStandalone=true, backlogId=null
 * - Does not affect existing items (placed or unplaced)
 *
 * Contract: TierListDB.insertTierList(userId, backlogId, artifactType, title, isStandalone)
 * - When isStandalone=true: creates a tier list with isStandalone=true and backlogId=null
 * - Default (no isStandalone arg) creates a non-standalone list
 */

const ART = [930001, 930002];

describe('TierListDB standalone contracts (live DB)', () => {
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
        await UserDB.signUp('standalone_owner', 'password123');
        ownerId = (await UserDB.getByUsername('standalone_owner'))!.id;
        for (const id of ART) {
            await runDbQuery(
                `INSERT INTO artifact (id, title, type, releaseDate, duration) VALUES (?, ?, ?, ?, ?)`,
                [id, `Artifact ${id}`, ArtifactType.GAME, '2020-01-01', 60]
            );
        }
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQuery(`DELETE FROM artifact WHERE id IN (${ART.map(() => '?').join(',')})`, ART);
        await runDbQueries([{ query: 'DELETE FROM user WHERE username = "standalone_owner"' }]);
    });

    describe('insertTierList with isStandalone=true', () => {
        it('creates a tier list with isStandalone=true when isStandalone argument is true', async () => {
            const id = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'Standalone List', true);
            const tl = await TierListDB.getTierListById(id);
            expect(tl).not.toBeNull();
            expect(tl!.isStandalone).toBe(true);
        });

        it('creates a tier list with backlogId=null when isStandalone=true', async () => {
            const id = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'Standalone List', true);
            const tl = await TierListDB.getTierListById(id);
            expect(tl!.backlogId).toBeNull();
        });

        it('defaults isStandalone to false when argument is omitted', async () => {
            const id = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'Normal List');
            const tl = await TierListDB.getTierListById(id);
            expect(tl!.isStandalone).toBe(false);
        });

        it('creates a non-standalone list with explicit isStandalone=false', async () => {
            const id = await TierListDB.insertTierList(ownerId, 99, ArtifactType.GAME, 'Linked List', false);
            const tl = await TierListDB.getTierListById(id);
            expect(tl!.isStandalone).toBe(false);
        });
    });

    describe('unlinkFromBacklog', () => {
        it('sets isStandalone=true on the tier list', async () => {
            const id = await TierListDB.insertTierList(ownerId, 42, ArtifactType.GAME, 'Linked List', false);

            await TierListDB.unlinkFromBacklog(id);

            const after = await TierListDB.getTierListById(id);
            expect(after).not.toBeNull();
            expect(after!.isStandalone).toBe(true);
        });

        it('sets backlogId=null on the tier list', async () => {
            const id = await TierListDB.insertTierList(ownerId, 42, ArtifactType.GAME, 'Linked List', false);

            // Verify initial state has a backlogId
            const before = await TierListDB.getTierListById(id);
            expect(before!.backlogId).toBe(42);

            await TierListDB.unlinkFromBacklog(id);

            const after = await TierListDB.getTierListById(id);
            expect(after!.backlogId).toBeNull();
        });

        it('does not affect ranked items when unlinking', async () => {
            const id = await TierListDB.insertTierList(ownerId, 42, ArtifactType.GAME, 'Linked List', false);
            const tierId = await TierListDB.insertTier(id, 'S', '#ff0000', 0);
            await TierListDB.insertItem(id, ART[0], tierId, 0);

            await TierListDB.unlinkFromBacklog(id);

            const itemIds = await TierListDB.getItemArtifactIds(id);
            expect(itemIds).toContain(ART[0]);
        });

        it('does not affect unranked (unplaced) items when unlinking', async () => {
            const id = await TierListDB.insertTierList(ownerId, 42, ArtifactType.GAME, 'Linked List', false);
            await TierListDB.insertItem(id, ART[1], null, 0);

            await TierListDB.unlinkFromBacklog(id);

            const itemIds = await TierListDB.getItemArtifactIds(id);
            expect(itemIds).toContain(ART[1]);
        });

        it('preserves both ranked and unranked items after unlink', async () => {
            const id = await TierListDB.insertTierList(ownerId, 42, ArtifactType.GAME, 'Linked List', false);
            const tierId = await TierListDB.insertTier(id, 'S', '#ff0000', 0);
            await TierListDB.insertItem(id, ART[0], tierId, 0);
            await TierListDB.insertItem(id, ART[1], null, 0);

            await TierListDB.unlinkFromBacklog(id);

            const itemIds = await TierListDB.getItemArtifactIds(id);
            expect(itemIds.sort()).toEqual([ART[0], ART[1]].sort());
        });

        it('unlinking an already-standalone tier list keeps it standalone with backlogId=null', async () => {
            const id = await TierListDB.insertTierList(ownerId, null, ArtifactType.GAME, 'Standalone List', true);

            await TierListDB.unlinkFromBacklog(id);

            const after = await TierListDB.getTierListById(id);
            expect(after!.isStandalone).toBe(true);
            expect(after!.backlogId).toBeNull();
        });
    });
});
