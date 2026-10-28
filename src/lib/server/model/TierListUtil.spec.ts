import { describe, expect, test } from 'vitest';
import { TierListUtil, DEFAULT_TIERS } from './TierListUtil';

/**
 * Contract: TierListUtil.tierIndexForScore(score) maps a per-user rating on a
 * 0-100 scale to a default-tier index (0=S .. 5=F). A null score means the item
 * is unranked and must return null (NOT force-distributed into a tier).
 * Bands: S 90-100 -> 0; A 80-89 -> 1; B 70-79 -> 2; C 60-69 -> 3; D 50-59 -> 4; F 0-49 -> 5.
 */
describe('TierListUtil.tierIndexForScore', () => {
    // Every boundary value from the contract, as [score, expectedIndex] pairs.
    const boundaryCases: Array<[number | null, number | null]> = [
        [100, 0],
        [90, 0],
        [89, 1],
        [80, 1],
        [79, 2],
        [70, 2],
        [69, 3],
        [60, 3],
        [59, 4],
        [50, 4],
        [49, 5],
        [0, 5],
        [null, null],
    ];

    test.each(boundaryCases)('score %s maps to tier index %s', (score, expected) => {
        expect(TierListUtil.tierIndexForScore(score)).toBe(expected);
    });

    test('null score returns null (unranked, not force-distributed)', () => {
        expect(TierListUtil.tierIndexForScore(null)).toBeNull();
    });

    test('mid-band values land in the expected tier', () => {
        expect(TierListUtil.tierIndexForScore(95)).toBe(0); // S
        expect(TierListUtil.tierIndexForScore(85)).toBe(1); // A
        expect(TierListUtil.tierIndexForScore(75)).toBe(2); // B
        expect(TierListUtil.tierIndexForScore(65)).toBe(3); // C
        expect(TierListUtil.tierIndexForScore(55)).toBe(4); // D
        expect(TierListUtil.tierIndexForScore(25)).toBe(5); // F
    });

    test('a non-null score always resolves to a valid tier index 0..5', () => {
        for (let score = 0; score <= 100; score++) {
            const index = TierListUtil.tierIndexForScore(score);
            expect(index).not.toBeNull();
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThanOrEqual(5);
        }
    });
});

/**
 * Contract: DEFAULT_TIERS is an ordered array of the 6 default tier definitions,
 * top -> bottom S,A,B,C,D,F. Each entry has a `label` and a `color` (hex string).
 * Length 6; labels in order ['S','A','B','C','D','F']; array order encodes
 * positions ascending from 0; each color is a valid hex string.
 */
describe('DEFAULT_TIERS', () => {
    test('contains exactly 6 tiers', () => {
        expect(DEFAULT_TIERS).toHaveLength(6);
    });

    test('labels are S,A,B,C,D,F in top-to-bottom order', () => {
        expect(DEFAULT_TIERS.map((t) => t.label)).toEqual(['S', 'A', 'B', 'C', 'D', 'F']);
    });

    test('every tier exposes a label and a color', () => {
        for (const tier of DEFAULT_TIERS) {
            expect(typeof tier.label).toBe('string');
            expect(tier.label.length).toBeGreaterThan(0);
            expect(typeof tier.color).toBe('string');
        }
    });

    test('every color is a valid hex string', () => {
        const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
        for (const tier of DEFAULT_TIERS) {
            expect(tier.color).toMatch(hexPattern);
        }
    });

    test('tier index returned by tierIndexForScore aligns with DEFAULT_TIERS order', () => {
        // The index contract and the DEFAULT_TIERS ordering must agree: the top
        // band (S) is index 0, the bottom band (F) is index 5.
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(100) as number].label).toBe('S');
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(85) as number].label).toBe('A');
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(75) as number].label).toBe('B');
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(65) as number].label).toBe('C');
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(55) as number].label).toBe('D');
        expect(DEFAULT_TIERS[TierListUtil.tierIndexForScore(0) as number].label).toBe('F');
    });
});

/**
 * Contract: refreshFromBacklog reconciliation set semantics.
 *
 * The contract for refreshFromBacklog (#3) and TierListDB.moveItem (#4) describes
 * behaviour of async, DB-touching functions. No pure partition/diff helper is
 * exported from TierListUtil or TierListDB (the only TierListUtil statics are
 * tierIndexForScore, createTierListFromBacklog, loadTierListPageInfo and
 * refreshFromBacklog — all DB-backed except tierIndexForScore). There is therefore
 * no public seam to unit-test the diff logic without a live database.
 *
 * The test below documents and locks in the SET-DIFFERENCE semantics the contract
 * requires (added = backlogIds - tierListIds; removalCandidates = tierListIds -
 * backlogIds; intersection is retained; empty backlog => all items are removal
 * candidates and added is empty). It validates the specified set algebra directly
 * so the expectation is recorded, independent of the DB wiring.
 */
describe('refreshFromBacklog reconciliation semantics (set algebra, DB seam not exported)', () => {
    function partition(tierListIds: number[], backlogIds: number[]) {
        const tierSet = new Set(tierListIds);
        const backlogSet = new Set(backlogIds);
        return {
            added: backlogIds.filter((id) => !tierSet.has(id)),
            removalCandidates: tierListIds.filter((id) => !backlogSet.has(id)),
            retained: tierListIds.filter((id) => backlogSet.has(id)),
        };
    }

    test('added = backlogIds - tierListIds; removalCandidates = tierListIds - backlogIds; intersection retained', () => {
        const tierListIds = [1, 2, 3];
        const backlogIds = [2, 3, 4, 5];
        const result = partition(tierListIds, backlogIds);
        expect(result.added.sort()).toEqual([4, 5]);
        expect(result.removalCandidates).toEqual([1]);
        expect(result.retained.sort()).toEqual([2, 3]);
    });

    test('missing/empty backlog turns every tier-list item into a removal candidate with no additions', () => {
        const tierListIds = [1, 2, 3];
        const backlogIds: number[] = [];
        const result = partition(tierListIds, backlogIds);
        expect(result.added).toEqual([]);
        expect(result.removalCandidates).toEqual([1, 2, 3]);
        expect(result.retained).toEqual([]);
    });

    test('exposes the async DB-backed refreshFromBacklog on the public surface', () => {
        // The reconciliation itself requires a live DB; we only assert the
        // documented entry point exists so coverage gaps are explicit.
        expect(typeof TierListUtil.refreshFromBacklog).toBe('function');
    });
});
