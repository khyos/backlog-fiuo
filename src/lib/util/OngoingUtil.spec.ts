import { describe, expect, test, beforeEach, vi } from 'vitest';
import { Tvshow } from '$lib/model/tvshow/Tvshow';
import { TvshowSeason } from '$lib/model/tvshow/TvshowSeason';
import { TvshowEpisode } from '$lib/model/tvshow/TvshowEpisode';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifact, UserArtifactStatus } from '$lib/model/UserArtifact';
import { processOngoingArtifacts } from './OngoingUtil';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';

describe('OngoingUtil', () => {
    let tvshow: Tvshow;
    let season1: TvshowSeason;
    let season2: TvshowSeason;
    let episode1: TvshowEpisode;
    let episode2: TvshowEpisode;
    let episode3: TvshowEpisode;
    let episode4: TvshowEpisode;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        // Create base TV show
        tvshow = new Tvshow(1, 'Test Show', ArtifactType.TVSHOW, currentDate, 900);
        
        // Create seasons
        season1 = new TvshowSeason(2, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450);
        season2 = new TvshowSeason(3, 2, 'Season 2', ArtifactType.TVSHOW_SEASON, currentDate, 450);
        
        // Create episodes
        episode1 = new TvshowEpisode(4, 1, 'S1E1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
        episode2 = new TvshowEpisode(5, 2, 'S1E2', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
        episode3 = new TvshowEpisode(6, 1, 'S2E1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
        episode4 = new TvshowEpisode(7, 2, 'S2E2', ArtifactType.TVSHOW_EPISODE, currentDate, 45);

        // Setup hierarchy
        tvshow.children = [season1, season2];
        season1.children = [episode1, episode2];
        season2.children = [episode3, episode4];

        // Mock ArtifactDB.getUserInfos
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => {
            return [];
        });
    });

    test('should process a TV show with no user artifact info', async () => {
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => []);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].userInfo).toBeNull();
        expect(result[0].lastAndNextOngoing.last).toBeNull();
        expect(result[0].lastAndNextOngoing.next?.id).toBe(episode1.id);
    });

    test('should process a TV show with finished status', async () => {
        const userInfo = new UserArtifact(1, tvshow.id, UserArtifactStatus.FINISHED, null, null, null);
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => [userInfo]);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].lastAndNextOngoing.last).toBeNull();
        expect(result[0].lastAndNextOngoing.next?.id).toBe(episode1.id);
    });

    test('should process ongoing show with partial completion', async () => {
        // Set episodes 1 and 2 as finished
        const userInfos = [
            new UserArtifact(1, tvshow.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, episode1.id, UserArtifactStatus.FINISHED, null, null, null),
            new UserArtifact(1, episode2.id, UserArtifactStatus.FINISHED, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].lastAndNextOngoing.last?.id).toBe(episode2.id);
        expect(result[0].lastAndNextOngoing.next?.id).toBe(episode3.id);
    });

    test('should process a show with no episodes', async () => {
        tvshow.children = [];
        const userInfo = new UserArtifact(1, tvshow.id, UserArtifactStatus.ON_GOING, null, null, null);
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => [userInfo]);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].lastAndNextOngoing.last).toBeNull();
        expect(result[0].lastAndNextOngoing.next).toBeNull();
    });

    test('should process a show with empty seasons', async () => {
        season1.children = [];
        season2.children = [];
        const userInfo = new UserArtifact(1, tvshow.id, UserArtifactStatus.ON_GOING, null, null, null);
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => [userInfo]);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].lastAndNextOngoing.last).toBeNull();
        expect(result[0].lastAndNextOngoing.next).toBeNull();
    });

    test('should process non-sequential episode completion', async () => {
        // Set episodes 1 and 3 as finished
        const userInfos = [
            new UserArtifact(1, tvshow.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, episode1.id, UserArtifactStatus.FINISHED, null, null, null),
            new UserArtifact(1, episode3.id, UserArtifactStatus.FINISHED, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow]);
        
        expect(result[0].lastAndNextOngoing.last?.id).toBe(episode1.id);
        expect(result[0].lastAndNextOngoing.next?.id).toBe(episode2.id);
    });

    test('should sort shows by ongoing status and next release date', async () => {
        // Create two more shows with different dates and statuses
        const laterDate = new Date('2025-06-01');
        const tvshow2 = new Tvshow(8, 'Second Show', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow2Episode = new TvshowEpisode(9, 1, 'S1E1', ArtifactType.TVSHOW_EPISODE, laterDate, 45);
        tvshow2.children = [new TvshowSeason(10, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, laterDate, 450)];
        tvshow2.children[0].children = [tvshow2Episode];

        const earlierDate = new Date('2024-12-01');
        const tvshow3 = new Tvshow(11, 'Third Show', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow3Episode = new TvshowEpisode(12, 1, 'S1E1', ArtifactType.TVSHOW_EPISODE, earlierDate, 45);
        tvshow3.children = [new TvshowSeason(13, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, earlierDate, 450)];
        tvshow3.children[0].children = [tvshow3Episode];

        // Mock user info with different statuses
        const userInfos = [
            new UserArtifact(1, tvshow.id, UserArtifactStatus.ON_HOLD, null, null, null),
            new UserArtifact(1, tvshow2.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, tvshow3.id, UserArtifactStatus.ON_GOING, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow, tvshow2, tvshow3]);
        
        // ON_GOING shows should be first, sorted by next release date
        expect(result[0].id).toBe(tvshow3.id); // ON_GOING with earlier date
        expect(result[1].id).toBe(tvshow2.id); // ON_GOING with later date
        expect(result[2].id).toBe(tvshow.id);  // ON_HOLD
    });

    test('should sort shows by title when no next episodes', async () => {
        // Create two more shows without episodes but with different titles
        const tvshow2 = new Tvshow(8, 'A Show', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow3 = new Tvshow(11, 'C Show', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow4 = new Tvshow(12, 'B Show', ArtifactType.TVSHOW, currentDate, 900);

        // Mock user info with ON_GOING status for all
        const userInfos = [
            new UserArtifact(1, tvshow2.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, tvshow3.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, tvshow4.id, UserArtifactStatus.ON_GOING, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow2, tvshow3, tvshow4]);
        
        // Shows should be sorted alphabetically by title
        expect(result[0].title).toBe('A Show');
        expect(result[1].title).toBe('B Show');
        expect(result[2].title).toBe('C Show');
    });

    test('should sort shows when one has release date and other does not', async () => {
        // Create two shows - one with release date and one without
        const tvshow2 = new Tvshow(8, 'Show with Date', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow2Episode = new TvshowEpisode(9, 1, 'S1E1', ArtifactType.TVSHOW_EPISODE, new Date('2025-06-01'), 45);
        tvshow2.children = [new TvshowSeason(10, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450)];
        tvshow2.children[0].children = [tvshow2Episode];

        const tvshow3 = new Tvshow(11, 'Show without Date', ArtifactType.TVSHOW, currentDate, 900);
        // No episodes/release dates for tvshow3

        // Mock user info with ON_GOING status for both
        const userInfos = [
            new UserArtifact(1, tvshow2.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, tvshow3.id, UserArtifactStatus.ON_GOING, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow2, tvshow3]);
        
        // Show with date should be first
        expect(result[0].title).toBe('Show with Date');
        expect(result[1].title).toBe('Show without Date');
    });

    test('should sort shows when neither has release dates', async () => {
        // Create two shows without any release dates
        const tvshow2 = new Tvshow(8, 'B Show No Date', ArtifactType.TVSHOW, currentDate, 900);
        const tvshow3 = new Tvshow(11, 'A Show No Date', ArtifactType.TVSHOW, currentDate, 900);

        // Mock user info with ON_GOING status for both
        const userInfos = [
            new UserArtifact(1, tvshow2.id, UserArtifactStatus.ON_GOING, null, null, null),
            new UserArtifact(1, tvshow3.id, UserArtifactStatus.ON_GOING, null, null, null)
        ];
        vi.spyOn(ArtifactDB, 'getUserInfos').mockImplementation(async () => userInfos);
        
        const result = await processOngoingArtifacts(1, [tvshow2, tvshow3]);
        
        // Should fall back to title sorting
        expect(result[0].title).toBe('A Show No Date');
        expect(result[1].title).toBe('B Show No Date');
    });
});