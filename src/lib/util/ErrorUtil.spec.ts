import { describe, it, expect } from 'vitest';
import { ErrorUtil } from './ErrorUtil';

describe('ErrorUtil', () => {
    describe('getErrorMessage', () => {
        it('should return message from Error object', () => {
            const error = new Error('Test error message');
            expect(ErrorUtil.getErrorMessage(error)).toBe('Test error message');
        });

        it('should return string error directly', () => {
            const error = 'String error message';
            expect(ErrorUtil.getErrorMessage(error)).toBe('String error message');
        });

        it('should return default message for unknown error types', () => {
            const error = { someProperty: 'value' };
            expect(ErrorUtil.getErrorMessage(error)).toBe('An unknown error occurred');
        });

        it('should handle null error', () => {
            expect(ErrorUtil.getErrorMessage(null)).toBe('An unknown error occurred');
        });

        it('should handle undefined error', () => {
            expect(ErrorUtil.getErrorMessage(undefined)).toBe('An unknown error occurred');
        });

        it('should handle custom error objects', () => {
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = 'CustomError';
                }
            }
            const error = new CustomError('Custom error message');
            expect(ErrorUtil.getErrorMessage(error)).toBe('Custom error message');
        });
    });
});