import { describe, expect, test, beforeEach } from 'vitest';
import { Tvshow, SERIALIZE_TYPE } from './Tvshow';
import { TvshowSeason } from './TvshowSeason';
import { TvshowEpisode } from './TvshowEpisode';
import { ArtifactType } from '../Artifact';
import { Link, LinkType } from '../Link';
import { Genre } from '../Genre';
import { Rating, RatingType } from '../Rating';
import { Tag, TagType } from '../Tag';
import { UserArtifact, UserArtifactStatus } from '../UserArtifact';

describe('Tvshow', () => {
    let tvshow: Tvshow;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        tvshow = new Tvshow(1, 'Test Show', ArtifactType.TVSHOW, currentDate, 900);
    });

    test('should create a TV show with correct initial values', () => {
        expect(tvshow.id).toBe(1);
        expect(tvshow.title).toBe('Test Show');
        expect(tvshow.type).toBe(ArtifactType.TVSHOW);
        expect(tvshow.releaseDate).toEqual(currentDate);
        expect(tvshow.duration).toBe(900);
        expect(tvshow.children).toEqual([]);
        expect(tvshow.childIndex).toBeNull();
        expect(tvshow.links).toEqual([]);
        expect(tvshow.genres).toEqual([]);
        expect(tvshow.ratings).toEqual([]);
        expect(tvshow.tags).toEqual([]);
        expect(tvshow.userInfo).toBeNull();
    });

    test('should compute mean rating correctly', () => {
        tvshow.ratings = [
            new Rating(RatingType.METACRITIC, 85),
            new Rating(RatingType.METACRITIC, 75)
        ];

        expect(tvshow.meanRating).toBe(80);
    });

    describe('computeLastAndNextOngoing', () => {
        let season1: TvshowSeason;
        let season2: TvshowSeason;
        let episode1: TvshowEpisode;
        let episode2: TvshowEpisode;
        let episode3: TvshowEpisode;
        let episode4: TvshowEpisode;

        beforeEach(() => {
            season1 = new TvshowSeason(2, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450);
            season2 = new TvshowSeason(3, 2, 'Season 2', ArtifactType.TVSHOW_SEASON, currentDate, 450);
            episode1 = new TvshowEpisode(4, 1, 'S1E1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode2 = new TvshowEpisode(5, 2, 'S1E2', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode3 = new TvshowEpisode(6, 1, 'S2E1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
            episode4 = new TvshowEpisode(7, 2, 'S2E2', ArtifactType.TVSHOW_EPISODE, currentDate, 45);

            season1.parent = tvshow;
            season2.parent = tvshow;
            episode1.parent = season1;
            episode2.parent = season1;
            episode3.parent = season2;
            episode4.parent = season2;

            season1.children = [episode1, episode2];
            season2.children = [episode3, episode4];
            tvshow.children = [season1, season2];
        });

        test('should return next episode when none are finished', () => {
            const result = tvshow.computeLastAndNextOngoing();
            expect(result.last).toBeNull();
            expect(result.next).toBe(episode1);
        });

        test('should return last finished and next unfinished episodes across seasons', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode2.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = tvshow.computeLastAndNextOngoing();
            expect(result.last).toBe(episode2);
            expect(result.next).toBe(episode3);
        });

        test('should return last finished episode when all are finished', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode2.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            episode4.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = tvshow.computeLastAndNextOngoing();
            expect(result.last).toBe(episode4);
            expect(result.next).toBeNull();
        });

        test('should handle non-sequential finished episodes across seasons', () => {
            episode1.updateUserStatus(UserArtifactStatus.FINISHED);
            episode3.updateUserStatus(UserArtifactStatus.FINISHED);
            
            const result = tvshow.computeLastAndNextOngoing();
            expect(result.last).toBe(episode1);
            expect(result.next).toBe(episode2);
        });
    });

    test('should serialize to JSON', () => {
        const season = new TvshowSeason(2, 1, 'Season 1', ArtifactType.TVSHOW_SEASON, currentDate, 450);
        const episode = new TvshowEpisode(3, 1, 'Episode 1', ArtifactType.TVSHOW_EPISODE, currentDate, 45);
        const link = new Link(LinkType.TMDB, 'https://example.com');
        const genre = new Genre(1, 'Drama');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);

        season.parent = tvshow;
        episode.parent = season;
        season.children = [episode];
        tvshow.children = [season];
        tvshow.links = [link];
        tvshow.genres = [genre];
        tvshow.ratings = [rating];
        tvshow.tags = [tag];
        tvshow.userInfo = userInfo;

        const json = tvshow.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Show',
            type: ArtifactType.TVSHOW,
            children: [season.toJSON()],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 900,
            links: [link.toJSON()],
            genres: [genre.toJSON()],
            ratings: [rating.toJSON()],
            meanRating: 85,
            tags: [tag.toJSON()],
            userInfo: userInfo.toJSON()
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            title: 'Test Show',
            type: ArtifactType.TVSHOW,
            children: [{
                __type: 'TvshowSeason',
                id: 2,
                title: 'Season 1',
                type: ArtifactType.TVSHOW_SEASON,
                children: [{
                    __type: 'TvshowEpisode',
                    id: 3,
                    title: 'Episode 1',
                    type: ArtifactType.TVSHOW_EPISODE,
                    children: [],
                    childIndex: 1,
                    releaseDate: currentDate.toISOString(),
                    duration: 45,
                    links: [],
                    genres: [],
                    ratings: [],
                    meanRating: null,
                    tags: [],
                    userInfo: null
                }],
                childIndex: 1,
                releaseDate: currentDate.toISOString(),
                duration: 450,
                links: [],
                genres: [],
                ratings: [],
                meanRating: null,
                tags: [],
                userInfo: null
            }],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 900,
            links: [{ 
                __type: 'Link',
                type: LinkType.TMDB,
                url: 'https://example.com'
            }],
            genres: [{ 
                __type: 'Genre',
                id: 1,
                title: 'Drama'
            }],
            ratings: [{ 
                __type: 'Rating',
                type: RatingType.METACRITIC,
                rating: 85
            }],
            meanRating: 85,
            tags: [{ 
                __type: 'Tag',
                id: 'tag1',
                type: TagType.DEFAULT
            }],
            userInfo: {
                __type: 'UserArtifact',
                id: 1,
                userId: 1,
                artifactId: 1,
                status: UserArtifactStatus.FINISHED,
                score: 8.5,
                startDate: null,
                endDate: null
            }
        };

        const data = Tvshow.fromJSON(json);

        expect(data).toBeInstanceOf(Tvshow);
        expect(data.id).toBe(1);
        expect(data.title).toBe('Test Show');
        expect(data.type).toBe(ArtifactType.TVSHOW);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(900);
        expect(data.children[0]).toBeInstanceOf(TvshowSeason);
        expect(data.children[0].parent).toBe(data);
        expect(data.children[0].children[0]).toBeInstanceOf(TvshowEpisode);
        expect(data.children[0].children[0].parent).toBe(data.children[0]);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});