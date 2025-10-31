import { describe, expect, test, vi, beforeEach, afterAll } from 'vitest';
import { artifactFromJSON, getAsyncInfo, getArtifact, getPosterURL, updateStatus, updateScore, updateDate } from './ArtifactService';
import { ArtifactType } from '$lib/model/Artifact';
import { Game } from '$lib/model/game/Game';
import { Movie } from '$lib/model/movie/Movie';
import { Tvshow } from '$lib/model/tvshow/Tvshow';
import { TvshowSeason } from '$lib/model/tvshow/TvshowSeason';
import { TvshowEpisode } from '$lib/model/tvshow/TvshowEpisode';
import { Anime } from '$lib/model/anime/Anime';
import { AnimeEpisode } from '$lib/model/anime/AnimeEpisode';
import { UserArtifactStatus } from '$lib/model/UserArtifact';

// Mock global fetch
const globalFetch = global.fetch;

// Mock alert since window is not available in Node.js environment
const mockAlert = vi.fn();
global.alert = mockAlert;

describe('ArtifactService', () => {
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = vi.fn();
        mockAlert.mockClear();
        vi.clearAllMocks();
    });

    afterAll(() => {
        global.fetch = globalFetch;
    });

    describe('getAsyncInfo', () => {
        test('should fetch anime info from MAL', async () => {
            const malResponse = {
                images: { jpg: { image_url: 'https://example.com/anime.jpg' } },
                synopsis: 'Test anime description'
            };

            global.fetch = vi.fn().mockResolvedValue({
                json: () => Promise.resolve(malResponse)
            });

            const info = await getAsyncInfo(ArtifactType.ANIME, 1);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/anime/1/mal');
            expect(info.poster).toBe('https://example.com/anime.jpg');
            expect(info.description).toBe('Test anime description');
        });

        test('should fetch game poster', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                text: () => Promise.resolve('https://example.com/game.jpg')
            });

            const info = await getAsyncInfo(ArtifactType.GAME, 1);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/game/1/poster');
            expect(info.poster).toBe('https://example.com/game.jpg');
            expect(info.description).toBeNull();
        });

        test('should fetch movie info from TMDB', async () => {
            const tmdbResponse = {
                poster_path: 'https://example.com/movie.jpg',
                overview: 'Test movie description'
            };

            global.fetch = vi.fn().mockResolvedValue({
                json: () => Promise.resolve(tmdbResponse)
            });

            const info = await getAsyncInfo(ArtifactType.MOVIE, 1);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/movie/1/tmdb');
            expect(info.poster).toBe('https://example.com/movie.jpg');
            expect(info.description).toBe('Test movie description');
        });

        test('should fetch TV show info from TMDB', async () => {
            const tmdbResponse = {
                poster_path: 'https://example.com/tvshow.jpg',
                overview: 'Test TV show description'
            };

            global.fetch = vi.fn().mockResolvedValue({
                json: () => Promise.resolve(tmdbResponse)
            });

            const info = await getAsyncInfo(ArtifactType.TVSHOW, 1);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/tvshow/1/tmdb');
            expect(info.poster).toBe('https://example.com/tvshow.jpg');
            expect(info.description).toBe('Test TV show description');
        });
    });

    describe('getPosterURL', () => {
        test('should return poster URL for artifact', async () => {
            const tmdbResponse = {
                poster_path: 'https://example.com/movie.jpg'
            };

            global.fetch = vi.fn().mockResolvedValue({
                json: () => Promise.resolve(tmdbResponse)
            });

            const posterUrl = await getPosterURL(ArtifactType.MOVIE, 1);
            expect(posterUrl).toBe('https://example.com/movie.jpg');
        });
    });

    describe('getArtifact', () => {
        test('should fetch and create movie artifact without user info', async () => {
            const movieData = {
                __type: 'Movie',
                id: 1,
                title: 'Test Movie',
                type: ArtifactType.MOVIE,
                releaseDate: currentDate.toISOString(),
                duration: 120,
                children: [],
                childIndex: null,
                links: [],
                genres: [],
                ratings: [],
                tags: []
            };

            global.fetch = vi.fn().mockResolvedValue({
                json: () => Promise.resolve(movieData)
            });

            const artifact = await getArtifact(ArtifactType.MOVIE, 1);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/movie/1');
            expect(artifact).toBeInstanceOf(Movie);
            expect(artifact.id).toBe(1);
            expect(artifact.title).toBe('Test Movie');
        });

        test('should fetch and create movie artifact with user info', async () => {
            const movieData = {
                __type: 'Movie',
                id: 1,
                title: 'Test Movie',
                type: ArtifactType.MOVIE,
                releaseDate: currentDate.toISOString(),
                duration: 120,
                children: [],
                childIndex: null,
                links: [],
                genres: [],
                ratings: [],
                tags: []
            };

            const userInfoData = [{
                __type: 'UserArtifact',
                userId: 1,
                artifactId: 1,
                status: UserArtifactStatus.FINISHED,
                score: 8.5,
                startDate: currentDate.toISOString(),
                endDate: currentDate.toISOString()
            }];

            global.fetch = vi.fn()
                .mockImplementationOnce(() => Promise.resolve({
                    json: () => Promise.resolve(movieData)
                }))
                .mockImplementationOnce(() => Promise.resolve({
                    json: () => Promise.resolve(userInfoData)
                }));

            const artifact = await getArtifact(ArtifactType.MOVIE, 1, true);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/movie/1');
            expect(global.fetch).toHaveBeenCalledWith('/api/userartifact/1');
            expect(artifact).toBeInstanceOf(Movie);
            expect(artifact.userInfo).toBeDefined();
            expect(artifact.userInfo?.status).toBe(UserArtifactStatus.FINISHED);
        });
    });

    describe('artifactFromJSON', () => {
        const baseArtifactData = {
            id: 1,
            title: 'Test',
            releaseDate: currentDate.toISOString(),
            duration: 120,
            children: [],
            childIndex: null,
            links: [],
            genres: [],
            ratings: [],
            meanRating: null,
            tags: [],
            userInfo: null
        };

        test('should create Anime instance', () => {
            const data = { ...baseArtifactData, __type: 'Anime', type: ArtifactType.ANIME };
            const artifact = artifactFromJSON(ArtifactType.ANIME, data);
            expect(artifact).toBeInstanceOf(Anime);
        });

        test('should create AnimeEpisode instance', () => {
            const data = { ...baseArtifactData, __type: 'AnimeEpisode', type: ArtifactType.ANIME_EPISODE };
            const artifact = artifactFromJSON(ArtifactType.ANIME_EPISODE, data);
            expect(artifact).toBeInstanceOf(AnimeEpisode);
        });

        test('should create Game instance', () => {
            const data = { ...baseArtifactData, __type: 'Game', type: ArtifactType.GAME };
            const artifact = artifactFromJSON(ArtifactType.GAME, data);
            expect(artifact).toBeInstanceOf(Game);
        });

        test('should create Movie instance', () => {
            const data = { ...baseArtifactData, __type: 'Movie', type: ArtifactType.MOVIE };
            const artifact = artifactFromJSON(ArtifactType.MOVIE, data);
            expect(artifact).toBeInstanceOf(Movie);
        });

        test('should create Tvshow instance', () => {
            const data = { ...baseArtifactData, __type: 'Tvshow', type: ArtifactType.TVSHOW };
            const artifact = artifactFromJSON(ArtifactType.TVSHOW, data);
            expect(artifact).toBeInstanceOf(Tvshow);
        });

        test('should create TvshowSeason instance', () => {
            const data = { ...baseArtifactData, __type: 'TvshowSeason', type: ArtifactType.TVSHOW_SEASON };
            const artifact = artifactFromJSON(ArtifactType.TVSHOW_SEASON, data);
            expect(artifact).toBeInstanceOf(TvshowSeason);
        });

        test('should create TvshowEpisode instance', () => {
            const data = { ...baseArtifactData, __type: 'TvshowEpisode', type: ArtifactType.TVSHOW_EPISODE };
            const artifact = artifactFromJSON(ArtifactType.TVSHOW_EPISODE, data);
            expect(artifact).toBeInstanceOf(TvshowEpisode);
        });

        test('should throw error for unsupported type', () => {
            const data = { ...baseArtifactData, __type: 'Invalid', type: 'INVALID' as ArtifactType };
            expect(() => artifactFromJSON('INVALID' as ArtifactType, data)).toThrow('Unsupported artifact type: INVALID');
        });
    });

    describe('updateStatus', () => {
        test('should send status update request', async () => {
            global.fetch = vi.fn().mockResolvedValue({});
            const consoleSpy = vi.spyOn(console, 'error');

            await updateStatus([1, 2], UserArtifactStatus.FINISHED);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/artifact/userStatus', {
                method: 'POST',
                body: JSON.stringify({
                    artifactIds: [1, 2],
                    status: UserArtifactStatus.FINISHED
                })
            });

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(mockAlert).not.toHaveBeenCalled();
        });

        test('should handle error in status update', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error');

            await updateStatus([1], UserArtifactStatus.FINISHED);

            expect(consoleSpy).toHaveBeenCalledWith('Error updating status:', expect.any(Error));
            expect(mockAlert).toHaveBeenCalledWith('Failed to update status');
        });
    });

    describe('updateScore', () => {
        test('should send score update request', async () => {
            global.fetch = vi.fn().mockResolvedValue({});
            const consoleSpy = vi.spyOn(console, 'error');

            await updateScore(1, 8.5);
            
            expect(global.fetch).toHaveBeenCalledWith('/api/artifact/1/userScore', {
                method: 'POST',
                body: JSON.stringify({ score: 8.5 })
            });

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(mockAlert).not.toHaveBeenCalled();
        });

        test('should handle error in score update', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error');

            await updateScore(1, 8.5);

            expect(consoleSpy).toHaveBeenCalledWith('Error updating score:', expect.any(Error));
            expect(mockAlert).toHaveBeenCalledWith('Failed to update score');
        });
    });

    describe('updateDate', () => {
        test('should send date update request', async () => {
            global.fetch = vi.fn().mockResolvedValue({});
            const consoleSpy = vi.spyOn(console, 'error');

            await updateDate(1, currentDate, 'start');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/artifact/1/userDate', {
                method: 'POST',
                body: JSON.stringify({
                    date: currentDate.toISOString(),
                    startEnd: 'start'
                })
            });

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(mockAlert).not.toHaveBeenCalled();
        });

        test('should handle error in date update', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            const consoleSpy = vi.spyOn(console, 'error');

            await updateDate(1, currentDate, 'start');

            expect(consoleSpy).toHaveBeenCalledWith('Error updating date:', expect.any(Error));
            expect(mockAlert).toHaveBeenCalledWith('Failed to update date');
        });

        test('should handle null date', async () => {
            global.fetch = vi.fn().mockResolvedValue({});

            await updateDate(1, null, 'both');
            
            expect(global.fetch).toHaveBeenCalledWith('/api/artifact/1/userDate', {
                method: 'POST',
                body: JSON.stringify({
                    date: null,
                    startEnd: 'both'
                })
            });
        });
    });
});