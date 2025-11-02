import { describe, it, expect } from 'vitest';
import { TextUtil } from './TextUtil';

describe('TextUtil', () => {
    describe('areEastAsianCharactersOverThreashold', () => {
        it('should return true for empty string', () => {
            expect(TextUtil.areEastAsianCharactersOverThreashold('')).toBe(true);
        });

        it('should return true for null input', () => {
            expect(TextUtil.areEastAsianCharactersOverThreashold(null as unknown as string)).toBe(true);
        });

        it('should return true when East Asian characters are below threshold', () => {
            // String with 25% East Asian characters (1/4)
            expect(TextUtil.areEastAsianCharactersOverThreashold('abc漢')).toBe(true);
        });

        it('should return false when East Asian characters are above threshold', () => {
            // String with 75% East Asian characters (3/4)
            expect(TextUtil.areEastAsianCharactersOverThreashold('a漢字語')).toBe(false);
        });

        it('should handle custom threshold', () => {
            // String with 50% East Asian characters
            const text = 'ab漢字';
            expect(TextUtil.areEastAsianCharactersOverThreashold(text, 0.3)).toBe(false);
            expect(TextUtil.areEastAsianCharactersOverThreashold(text, 0.7)).toBe(true);
        });

        it('should handle pure Latin text', () => {
            expect(TextUtil.areEastAsianCharactersOverThreashold('Hello World')).toBe(true);
        });

        it('should handle pure East Asian text', () => {
            expect(TextUtil.areEastAsianCharactersOverThreashold('漢字韓文')).toBe(false);
        });
    });
});