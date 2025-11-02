import { describe, it, expect } from 'vitest';
import { OrderUtil } from './OrderUtil';

describe('OrderUtil', () => {
    describe('getRandomIntegerBetween', () => {
        it('should return a number within the specified range', () => {
            const min = 1;
            const max = 10;
            const result = OrderUtil.getRandomIntegerBetween(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
        });

        it('should handle same min and max values', () => {
            const value = 5;
            expect(OrderUtil.getRandomIntegerBetween(value, value)).toBe(value);
        });

        it('should return integer values', () => {
            const result = OrderUtil.getRandomIntegerBetween(1, 10);
            expect(Number.isInteger(result)).toBe(true);
        });

        it('should handle negative numbers', () => {
            const min = -10;
            const max = -1;
            const result = OrderUtil.getRandomIntegerBetween(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
        });

        it('should handle zero', () => {
            const min = -5;
            const max = 5;
            const result = OrderUtil.getRandomIntegerBetween(min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
        });
    });
});