import { describe, it, expect } from 'vitest';
import { TierList, SERIALIZE_TYPE } from './TierList';
import { ArtifactType } from './Artifact';
import { Tier } from './Tier';
import { TierListItem } from './TierListItem';
import { Game } from './game/Game';

/**
 * Contract: TierList model — isStandalone field
 * - isStandalone defaults to false when not provided
 * - toJSON() includes isStandalone
 * - fromJSON() round-trips isStandalone (both true and false)
 */
describe('TierList model — isStandalone field', () => {
    it('defaults isStandalone to false when not specified', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List');
        expect(tl.isStandalone).toBe(false);
    });

    it('accepts true for isStandalone', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', true);
        expect(tl.isStandalone).toBe(true);
    });

    it('accepts false for isStandalone explicitly', () => {
        const tl = new TierList(1, 10, 5, ArtifactType.GAME, 'My List', false);
        expect(tl.isStandalone).toBe(false);
    });

    it('toJSON() includes isStandalone: false', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', false);
        const json = tl.toJSON();
        expect(json).toHaveProperty('isStandalone', false);
    });

    it('toJSON() includes isStandalone: true', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', true);
        const json = tl.toJSON();
        expect(json).toHaveProperty('isStandalone', true);
    });

    it('fromJSON() round-trips isStandalone=true', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', true);
        const json = tl.toJSON();
        const restored = TierList.fromJSON(json);
        expect(restored.isStandalone).toBe(true);
    });

    it('fromJSON() round-trips isStandalone=false', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', false);
        const json = tl.toJSON();
        const restored = TierList.fromJSON(json);
        expect(restored.isStandalone).toBe(false);
    });

    it('toJSON() includes __type equal to SERIALIZE_TYPE', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List');
        expect(tl.toJSON().__type).toBe(SERIALIZE_TYPE);
    });

    it('fromJSON() throws when __type does not match SERIALIZE_TYPE', () => {
        const badJson = {
            __type: 'WrongType',
            id: 1,
            userId: 10,
            backlogId: null,
            artifactType: ArtifactType.GAME,
            title: 'My List',
            isStandalone: false,
            tiers: [],
            unranked: []
        };
        expect(() => TierList.fromJSON(badJson as never)).toThrow();
    });

    it('toJSON() preserves backlogId=null and isStandalone=true for a standalone tier list', () => {
        const tl = new TierList(1, 10, null, ArtifactType.GAME, 'My List', true);
        const json = tl.toJSON();
        expect(json.backlogId).toBeNull();
        expect(json.isStandalone).toBe(true);
    });

    it('toJSON() preserves all scalar fields', () => {
        const tl = new TierList(42, 7, 3, ArtifactType.MOVIE, 'Film List', false);
        const json = tl.toJSON();
        expect(json.id).toBe(42);
        expect(json.userId).toBe(7);
        expect(json.backlogId).toBe(3);
        expect(json.artifactType).toBe(ArtifactType.MOVIE);
        expect(json.title).toBe('Film List');
        expect(json.isStandalone).toBe(false);
    });

    it('fromJSON() round-trips a standalone tier list with all fields intact', () => {
        const tl = new TierList(5, 2, null, ArtifactType.ANIME, 'Anime Tier', true);
        const restored = TierList.fromJSON(tl.toJSON());
        expect(restored.id).toBe(5);
        expect(restored.userId).toBe(2);
        expect(restored.backlogId).toBeNull();
        expect(restored.artifactType).toBe(ArtifactType.ANIME);
        expect(restored.title).toBe('Anime Tier');
        expect(restored.isStandalone).toBe(true);
    });
});

/**
 * Standards tests: TierList nested serialization paths
 *
 * Reading the implementation reveals that toJSON() calls tier.toJSON() and item.toJSON()
 * on nested collections, and fromJSON() calls Tier.fromJSON() and TierListItem.fromJSON().
 * The contract tests above only exercise the scalar fields — these tests verify that
 * the nested delegation works correctly (e.g. an item in the unranked pool survives
 * a full round-trip with its tierId=null preserved).
 */
describe('TierList nested serialization', () => {
    function makeGame(id: number): Game {
        return new Game(id, `Game ${id}`, ArtifactType.GAME, new Date('2020-01-01'), 60);
    }

    it('round-trips a TierList with tiers containing items', () => {
        const game = makeGame(1);
        const item = new TierListItem(game, 10, 0);
        const tier = new Tier(10, 'S', '#ff0000', 0, [item]);
        const tl = new TierList(1, 2, null, ArtifactType.GAME, 'Test', true, [tier], []);

        const restored = TierList.fromJSON(tl.toJSON());

        expect(restored.tiers).toHaveLength(1);
        expect(restored.tiers[0].label).toBe('S');
        expect(restored.tiers[0].color).toBe('#ff0000');
        expect(restored.tiers[0].position).toBe(0);
        expect(restored.tiers[0].items).toHaveLength(1);
        expect(restored.tiers[0].items[0].artifact.id).toBe(1);
    });

    it('round-trips a TierList with items in the unranked pool (tierId=null)', () => {
        const game = makeGame(2);
        const unrankedItem = new TierListItem(game, null, 0);
        const tl = new TierList(1, 2, null, ArtifactType.GAME, 'Test', true, [], [unrankedItem]);

        const restored = TierList.fromJSON(tl.toJSON());

        expect(restored.unranked).toHaveLength(1);
        expect(restored.unranked[0].tierId).toBeNull();
        expect(restored.unranked[0].artifact.id).toBe(2);
        expect(restored.tiers).toHaveLength(0);
    });

    it('toJSON() serializes empty tiers and unranked as empty arrays', () => {
        const tl = new TierList(1, 2, null, ArtifactType.GAME, 'Empty', false);
        const json = tl.toJSON();
        expect(json.tiers).toEqual([]);
        expect(json.unranked).toEqual([]);
    });

    it('toJSON() output contains the correct __type for tiers and items', () => {
        const game = makeGame(3);
        const item = new TierListItem(game, 5, 0);
        const tier = new Tier(5, 'A', '#00ff00', 1, [item]);
        const tl = new TierList(1, 2, null, ArtifactType.GAME, 'Test', false, [tier], []);
        const json = tl.toJSON();

        expect(json.tiers[0].__type).toBe('Tier');
        expect(json.tiers[0].items[0].__type).toBe('TierListItem');
    });
});
