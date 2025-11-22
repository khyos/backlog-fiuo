import { describe, expect, test } from 'vitest';
import { Backlog, SERIALIZE_TYPE, BacklogRankingType, BacklogOrder, BacklogOrderLabel, type IBacklog, BacklogType } from './Backlog';
import { BacklogItem } from './BacklogItem';
import { Movie } from './movie/Movie';
import { ArtifactType } from './Artifact';
import { Tag, TagType } from './Tag';

describe('Backlog', () => {
    const currentDate = new Date('2025-01-01');
    const movie1 = new Movie(1, 'Test Movie 1', ArtifactType.MOVIE, currentDate, 120);
    const movie2 = new Movie(2, 'Test Movie 2', ArtifactType.MOVIE, currentDate, 130);
    const tag = new Tag('tag1', TagType.DEFAULT);
    const dateAdded = Date.now();

    test('should create a backlog with correct initial values', () => {
        const backlog = new Backlog(1, 100, BacklogType.STANDARD, BacklogRankingType.ELO, 'My Movies', ArtifactType.MOVIE);

        expect(backlog.id).toBe(1);
        expect(backlog.userId).toBe(100);
        expect(backlog.rankingType).toBe(BacklogRankingType.ELO);
        expect(backlog.title).toBe('My Movies');
        expect(backlog.artifactType).toBe(ArtifactType.MOVIE);
        expect(backlog.backlogItems).toEqual([]);
    });

    test('should serialize to JSON', () => {
        const backlog = new Backlog(1, 100, BacklogType.STANDARD, BacklogRankingType.ELO, 'My Movies', ArtifactType.MOVIE);
        const backlogItem1 = new BacklogItem(1, 1000, dateAdded, movie1, [tag]);
        const backlogItem2 = new BacklogItem(2, 1100, dateAdded, movie2, []);
        backlog.backlogItems = [backlogItem1, backlogItem2];

        const json = backlog.toJSON();

        expect(json).toEqual({
            __type: SERIALIZE_TYPE,
            id: 1,
            userId: 100,
            type: BacklogType.STANDARD,
            rankingType: BacklogRankingType.ELO,
            title: 'My Movies',
            artifactType: ArtifactType.MOVIE,
            backlogItems: [backlogItem1.toJSON(), backlogItem2.toJSON()]
        });
    });

    test('should deserialize from JSON', () => {
        const json = {
            __type: SERIALIZE_TYPE,
            id: 1,
            userId: 100,
            type: BacklogType.STANDARD,
            rankingType: BacklogRankingType.ELO,
            title: 'My Movies',
            artifactType: ArtifactType.MOVIE,
            backlogItems: [
                {
                    __type: 'BacklogItem',
                    rank: 1,
                    elo: 1000,
                    dateAdded: dateAdded,
                    artifact: {
                        __type: 'Movie',
                        id: 1,
                        title: 'Test Movie 1',
                        type: ArtifactType.MOVIE,
                        children: [],
                        childIndex: null,
                        releaseDate: currentDate.toISOString(),
                        duration: 120,
                        links: [],
                        genres: [],
                        ratings: [],
                        meanRating: null,
                        tags: [],
                        userInfo: null
                    },
                    tags: [{
                        __type: 'Tag',
                        id: 'tag1',
                        type: TagType.DEFAULT
                    }]
                }
            ]
        };

        const backlog = Backlog.fromJSON(json);

        expect(backlog).toBeInstanceOf(Backlog);
        expect(backlog.id).toBe(1);
        expect(backlog.userId).toBe(100);
        expect(backlog.rankingType).toBe(BacklogRankingType.ELO);
        expect(backlog.title).toBe('My Movies');
        expect(backlog.artifactType).toBe(ArtifactType.MOVIE);
        expect(backlog.backlogItems).toHaveLength(1);
        expect(backlog.backlogItems[0]).toBeInstanceOf(BacklogItem);
        expect(backlog.backlogItems[0].artifact).toBeInstanceOf(Movie);
        expect(backlog.backlogItems[0].artifact.title).toBe('Test Movie 1');
    });

    test('should throw error when deserializing invalid type', () => {
        const json = {
            __type: 'InvalidType',
            id: 1,
            userId: 100,
            type: BacklogType.STANDARD,
            rankingType: BacklogRankingType.ELO,
            title: 'My Movies',
            artifactType: ArtifactType.MOVIE,
            backlogItems: []
        };

        expect(() => Backlog.fromJSON(json as IBacklog)).toThrow('Invalid Type');
    });

    test('BacklogOrder should have correct labels', () => {
        expect(BacklogOrderLabel[BacklogOrder.RANK]).toBe('Rank');
        expect(BacklogOrderLabel[BacklogOrder.ELO]).toBe('Elo');
        expect(BacklogOrderLabel[BacklogOrder.DATE_ADDED]).toBe('Date Added in List');
        expect(BacklogOrderLabel[BacklogOrder.DATE_RELEASE]).toBe('Release Date');
        expect(BacklogOrderLabel[BacklogOrder.RATING]).toBe('Rating');
    });
});