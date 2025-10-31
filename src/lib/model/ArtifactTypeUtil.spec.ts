import { describe, expect, test } from 'vitest';
import { ArtifactTypeUtil } from './ArtifactTypeUtil';
import { ArtifactType } from './Artifact';

describe('ArtifactTypeUtil', () => {
    describe('getChildName', () => {
        test('should return correct child names for TV show', () => {
            expect(ArtifactTypeUtil.getChildName(ArtifactType.TVSHOW, 0)).toBe('Season');
            expect(ArtifactTypeUtil.getChildName(ArtifactType.TVSHOW, 1)).toBe('Episode');
            expect(ArtifactTypeUtil.getChildName(ArtifactType.TVSHOW, 2)).toBeNull();
        });

        test('should return correct child names for anime', () => {
            expect(ArtifactTypeUtil.getChildName(ArtifactType.ANIME, 0)).toBe('Episode');
            expect(ArtifactTypeUtil.getChildName(ArtifactType.ANIME, 1)).toBeNull();
        });

        test('should return null for movie', () => {
            expect(ArtifactTypeUtil.getChildName(ArtifactType.MOVIE, 0)).toBeNull();
            expect(ArtifactTypeUtil.getChildName(ArtifactType.MOVIE, 1)).toBeNull();
        });

        test('should return null for game', () => {
            expect(ArtifactTypeUtil.getChildName(ArtifactType.GAME, 0)).toBeNull();
            expect(ArtifactTypeUtil.getChildName(ArtifactType.GAME, 1)).toBeNull();
        });

        test('should return null for child types', () => {
            expect(ArtifactTypeUtil.getChildName(ArtifactType.TVSHOW_SEASON, 0)).toBeNull();
            expect(ArtifactTypeUtil.getChildName(ArtifactType.TVSHOW_EPISODE, 0)).toBeNull();
            expect(ArtifactTypeUtil.getChildName(ArtifactType.ANIME_EPISODE, 0)).toBeNull();
        });
    });

    describe('getChildrenDepth', () => {
        test('should return correct depth for TV show', () => {
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.TVSHOW)).toBe(2);
        });

        test('should return correct depth for anime', () => {
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.ANIME)).toBe(1);
        });

        test('should return 0 for movie', () => {
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.MOVIE)).toBe(0);
        });

        test('should return 0 for game', () => {
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.GAME)).toBe(0);
        });

        test('should return 0 for child types', () => {
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.TVSHOW_SEASON)).toBe(0);
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.TVSHOW_EPISODE)).toBe(0);
            expect(ArtifactTypeUtil.getChildrenDepth(ArtifactType.ANIME_EPISODE)).toBe(0);
        });
    });
});