import { describe, it, expect } from 'vitest';
import { TimeUtil } from './TimeUtil';

describe('TimeUtil', () => {
    describe('formatDuration', () => {
        it('should return N/A for null duration', () => {
            expect(TimeUtil.formatDuration(null)).toBe('N/A');
        });

        it('should format hours only', () => {
            expect(TimeUtil.formatDuration(7200)).toBe('2h ');
        });

        it('should format minutes only', () => {
            expect(TimeUtil.formatDuration(120)).toBe('2m');
        });

        it('should format hours and minutes', () => {
            expect(TimeUtil.formatDuration(3660)).toBe('1h 1m');
        });

        it('should handle zero duration', () => {
            expect(TimeUtil.formatDuration(0)).toBe('');
        });
    });

    describe('formatDate', () => {
        it('should return TBD for null date', () => {
            expect(TimeUtil.formatDate(null)).toBe('TBD');
        });

        it('should return year only for December 31st dates', () => {
            const date = new Date(2024, 11, 31);
            expect(TimeUtil.formatDate(date)).toBe('2024');
        });

        it('should return TBD for dates beyond 2100', () => {
            const date = new Date(2100, 0, 1);
            expect(TimeUtil.formatDate(date)).toBe('TBD');
        });

        it('should format regular dates correctly', () => {
            const date = new Date(2024, 5, 15);
            expect(TimeUtil.formatDate(date)).toBe(date.toLocaleDateString());
        });
    });
});