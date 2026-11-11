import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { runDbQueries } from '../database';
import { TierListUtil, DEFAULT_TIERS, TIER_LIST_ARTIFACT_TYPES } from './TierListUtil';
import { TierListDB } from './TierListDB';
import { UserDB } from './UserDB';
import { ArtifactDB } from './ArtifactDB';
import { ArtifactType } from '#lib/model/Artifact';

/**
 * Contract: TierListUtil.createStandaloneTierList(userId, artifactType, title)
 * - Creates a standalone tier list: isStandalone=true, backlogId=null
 * - Populates the tier list with default tiers (S, A, B, C, D, F)
 * - Returns the new tier list ID (a positive integer)
 * - artifactType must be a root type (not a child type like ANIME_EPISODE)
 *
 * Contract: TIER_LIST_ARTIFACT_TYPES
 * - Contains only root artifact types (not child subtypes like ANIME_EPISODE, TVSHOW_SEASON, TVSHOW_EPISODE)
 */

describe('TierListUtil.createStandaloneTierList (live DB)', () => {
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
        await UserDB.signUp('standalone_util_owner', 'password123');
        ownerId = (await UserDB.getByUsername('standalone_util_owner'))!.id;
    });

    beforeEach(async () => {
        await cleanTierTables();
    });

    afterAll(async () => {
        await cleanTierTables();
        await runDbQueries([{ query: 'DELETE FROM user WHERE username = "standalone_util_owner"' }]);
    });

    it('returns a positive numeric tier list ID', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
    });

    it('creates a tier list with isStandalone=true', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListById(id);
        expect(tl).not.toBeNull();
        expect(tl!.isStandalone).toBe(true);
    });

    it('creates a tier list with backlogId=null', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListById(id);
        expect(tl!.backlogId).toBeNull();
    });

    it('creates the tier list owned by the given userId', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListById(id);
        expect(tl!.userId).toBe(ownerId);
    });

    it('creates the tier list with the given artifactType', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.MOVIE, 'My Movie List');
        const tl = await TierListDB.getTierListById(id);
        expect(tl!.artifactType).toBe(ArtifactType.MOVIE);
    });

    it('creates the tier list with the given title', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'Special Title Here');
        const tl = await TierListDB.getTierListById(id);
        expect(tl!.title).toBe('Special Title Here');
    });

    it('creates exactly the default number of tiers (S, A, B, C, D, F)', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListByIdWithItems(id);
        expect(tl!.tiers).toHaveLength(DEFAULT_TIERS.length);
    });

    it('creates default tiers in the correct order (S, A, B, C, D, F)', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListByIdWithItems(id);
        expect(tl!.tiers.map(t => t.label)).toEqual(DEFAULT_TIERS.map(t => t.label));
    });

    it('creates the tier list with no items (empty unranked pool and empty tiers)', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.GAME, 'My Standalone List');
        const tl = await TierListDB.getTierListByIdWithItems(id);
        expect(tl!.unranked).toHaveLength(0);
        for (const tier of tl!.tiers) {
            expect(tier.items).toHaveLength(0);
        }
    });

    it('works with ANIME as artifactType', async () => {
        const id = await TierListUtil.createStandaloneTierList(ownerId, ArtifactType.ANIME, 'Anime List');
        const tl = await TierListDB.getTierListById(id);
        expect(tl!.isStandalone).toBe(true);
        expect(tl!.artifactType).toBe(ArtifactType.ANIME);
    });
});

/**
 * Contract: TIER_LIST_ARTIFACT_TYPES
 * - Contains only root artifact types (not child/sub-types)
 * - Excludes ANIME_EPISODE, TVSHOW_SEASON, TVSHOW_EPISODE
 */
describe('TIER_LIST_ARTIFACT_TYPES — root types only', () => {
    it('does not contain ANIME_EPISODE (a child type)', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).not.toContain(ArtifactType.ANIME_EPISODE);
    });

    it('does not contain TVSHOW_SEASON (a child type)', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).not.toContain(ArtifactType.TVSHOW_SEASON);
    });

    it('does not contain TVSHOW_EPISODE (a child type)', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).not.toContain(ArtifactType.TVSHOW_EPISODE);
    });

    it('contains GAME', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.GAME);
    });

    it('contains MOVIE', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.MOVIE);
    });

    it('contains TVSHOW', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.TVSHOW);
    });

    it('contains ANIME', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.ANIME);
    });

    it('contains MANGA', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.MANGA);
    });

    it('contains COMICS', () => {
        expect(TIER_LIST_ARTIFACT_TYPES).toContain(ArtifactType.COMICS);
    });
});
