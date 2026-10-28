import { describe, it, expect } from 'vitest';
import { computeTargetPosition } from './dnd';

/**
 * Standards tests for the drop-position computation in dnd.ts.
 *
 * `computeTargetPosition` is the pure core of `handleDrop` (extracted verbatim so
 * it can be unit-tested). It is where the within-tier / within-pool reorder
 * bug-fix lives. These tests cover the branches that are only visible by reading
 * the implementation:
 *   - the horizontal midpoint branch (insert BEFORE vs AFTER the hovered item)
 *   - the same-tier post-removal decrement (`sourceIndex < targetPosition`)
 *   - null-safe tier equality (both null = the Unranked pool)
 *   - the cross-tier vs same-tier boundary (S == T, S just below T, S above T)
 *   - append / right-half-of-last-item / vertical (non-horizontal) container drops
 *
 * The helper takes the already-read geometry (offsetX, targetWidth) so it is
 * deterministic and does not need a DOM.
 */

// Convenience wrapper with sensible defaults so each test only states what matters.
function compute(overrides: Partial<Parameters<typeof computeTargetPosition>[0]>): number {
    return computeTargetPosition({
        basePosition: 0,
        horizontal: false,
        offsetX: 0,
        targetWidth: 80,
        sourceTierId: 1,
        targetTierId: 2,
        sourceIndex: 0,
        ...overrides
    });
}

describe('computeTargetPosition - horizontal midpoint branch', () => {
    it('inserts BEFORE the hovered item when the pointer is in its left half (cross-tier)', () => {
        // offsetX (30) <= width/2 (40) -> no +1; cross-tier so no decrement either.
        expect(compute({ horizontal: true, basePosition: 2, offsetX: 30, targetWidth: 80 })).toBe(2);
    });

    it('inserts AFTER the hovered item when the pointer is in its right half (cross-tier)', () => {
        // offsetX (50) > width/2 (40) -> +1; cross-tier so no decrement.
        expect(compute({ horizontal: true, basePosition: 2, offsetX: 50, targetWidth: 80 })).toBe(3);
    });

    it('treats exactly the midpoint as the left half (strict greater-than, no +1)', () => {
        expect(compute({ horizontal: true, basePosition: 1, offsetX: 40, targetWidth: 80 })).toBe(1);
    });

    it('ignores offsetX entirely when the dropzone is not horizontal (vertical/container)', () => {
        // A container (non-horizontal) drop never adds +1 regardless of offsetX.
        expect(compute({ horizontal: false, basePosition: 3, offsetX: 999, targetWidth: 80 })).toBe(3);
    });

    it('right half of the LAST item appends past it (base = last index, +1)', () => {
        // 4 items [0..3], hovering the right half of index 3 -> insert at 4 (append), cross-tier.
        expect(compute({ horizontal: true, basePosition: 3, offsetX: 60, targetWidth: 80 })).toBe(4);
    });
});

describe('computeTargetPosition - same-tier post-removal decrement', () => {
    it('decrements when the source sat BEFORE the insertion index in the same tier', () => {
        // Same tier (5 === 5), sourceIndex 0 < targetPosition 3 -> 3 - 1 = 2.
        expect(compute({ basePosition: 3, sourceTierId: 5, targetTierId: 5, sourceIndex: 0 })).toBe(2);
    });

    it('does NOT decrement when the source sat AT the insertion index (S == T boundary)', () => {
        // sourceIndex 3 is not < 3 -> no decrement; stable no-op drop onto own slot.
        expect(compute({ basePosition: 3, sourceTierId: 5, targetTierId: 5, sourceIndex: 3 })).toBe(3);
    });

    it('does NOT decrement when the source sat AFTER the insertion index (S above T)', () => {
        // Dragging an item backward (sourceIndex 4 > targetPosition 1) keeps the index.
        expect(compute({ basePosition: 1, sourceTierId: 5, targetTierId: 5, sourceIndex: 4 })).toBe(1);
    });

    it('decrements for the S-just-below-T boundary (sourceIndex === targetPosition - 1)', () => {
        // sourceIndex 2 < targetPosition 3 -> 2. Moving an item one slot toward the end
        // is a no-op after accounting for its own removal.
        expect(compute({ basePosition: 3, sourceTierId: 5, targetTierId: 5, sourceIndex: 2 })).toBe(2);
    });

    it('never produces a negative index when moving within the same tier to the front', () => {
        // base 0, sourceIndex 0 is not < 0, so no decrement -> stays 0.
        expect(compute({ basePosition: 0, sourceTierId: 5, targetTierId: 5, sourceIndex: 0 })).toBe(0);
    });

    it('does NOT decrement across different tiers even when sourceIndex < targetPosition', () => {
        // Cross-tier move: the item is removed from a DIFFERENT list, so no shift applies.
        expect(compute({ basePosition: 3, sourceTierId: 1, targetTierId: 2, sourceIndex: 0 })).toBe(3);
    });
});

describe('computeTargetPosition - null-safe tier equality (Unranked pool)', () => {
    it('treats both-null (pool -> pool) as the same tier and decrements', () => {
        expect(compute({ basePosition: 2, sourceTierId: null, targetTierId: null, sourceIndex: 0 })).toBe(1);
    });

    it('does NOT decrement when moving from the pool (null) into a real tier', () => {
        expect(compute({ basePosition: 2, sourceTierId: null, targetTierId: 3, sourceIndex: 0 })).toBe(2);
    });

    it('does NOT decrement when moving from a real tier into the pool (null)', () => {
        expect(compute({ basePosition: 2, sourceTierId: 3, targetTierId: null, sourceIndex: 0 })).toBe(2);
    });

    it('does not confuse tier id 0 with the null pool', () => {
        // tierId 0 is a real tier; null pool must NOT be considered equal to it.
        expect(compute({ basePosition: 2, sourceTierId: 0, targetTierId: null, sourceIndex: 0 })).toBe(2);
        expect(compute({ basePosition: 2, sourceTierId: null, targetTierId: 0, sourceIndex: 0 })).toBe(2);
    });
});

describe('computeTargetPosition - combined horizontal + decrement', () => {
    it('applies the +1 (right half) BEFORE the same-tier decrement', () => {
        // Same tier, base 1, right half -> +1 = 2, then sourceIndex 0 < 2 -> 1.
        expect(compute({
            horizontal: true, basePosition: 1, offsetX: 60, targetWidth: 80,
            sourceTierId: 7, targetTierId: 7, sourceIndex: 0
        })).toBe(1);
    });

    it('dragging an item onto its own right half is a stable no-op (+1 then -1)', () => {
        // Item at index 2 dropped on its own right half: base 2 -> +1 = 3, sourceIndex 2 < 3 -> 2.
        expect(compute({
            horizontal: true, basePosition: 2, offsetX: 60, targetWidth: 80,
            sourceTierId: 7, targetTierId: 7, sourceIndex: 2
        })).toBe(2);
    });

    it('dragging an item onto its own left half is a stable no-op (no +1, no -1)', () => {
        // base 2, left half -> 2, sourceIndex 2 is not < 2 -> 2.
        expect(compute({
            horizontal: true, basePosition: 2, offsetX: 10, targetWidth: 80,
            sourceTierId: 7, targetTierId: 7, sourceIndex: 2
        })).toBe(2);
    });
});
