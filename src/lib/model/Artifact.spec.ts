import { describe, expect, test, beforeEach } from 'vitest';
import { Artifact, ArtifactType } from './Artifact';
import { UserArtifact, UserArtifactStatus } from './UserArtifact';
import { Genre } from './Genre';
import { Link, LinkType } from './Link';
import { Rating, RatingType } from './Rating';
import { Tag, TagType } from './Tag';

// Create a concrete implementation of Artifact for testing
class TestArtifact extends Artifact {
    computeMeanRating(): number | null {
        if (this.ratings.length === 0) return null;
        // Get the numeric value from the rating type and rating
        const sum = this.ratings.reduce((acc, rating) => {
            switch(rating.type) {
                case RatingType.MAL:
                    return acc + (rating.rating * 10);
                case RatingType.METACRITIC:
                case RatingType.OPENCRITIC:
                    return acc + rating.rating;
                case RatingType.ROTTEN_TOMATOES_AUDIENCE:
                case RatingType.ROTTEN_TOMATOES_CRITICS:
                    return acc + rating.rating;
                case RatingType.SENSCRITIQUE:
                    return acc + (rating.rating * 20);
                case RatingType.STEAM:
                    return acc + rating.rating;
                default:
                    return acc;
            }
        }, 0);
        return sum / this.ratings.length;
    }

    computeLastAndNextOngoing(): { last: Artifact | null; next: Artifact | null } {
        return {
            last: null,
            next: null
        };
    }
}

describe('Artifact', () => {
    let artifact: TestArtifact;
    const currentDate = new Date('2025-01-01');

    beforeEach(() => {
        artifact = new TestArtifact(1, 'Test Artifact', ArtifactType.MOVIE, currentDate, 120);
    });

    test('should create an artifact with correct initial values', () => {
        expect(artifact.id).toBe(1);
        expect(artifact.title).toBe('Test Artifact');
        expect(artifact.type).toBe(ArtifactType.MOVIE);
        expect(artifact.releaseDate).toEqual(currentDate);
        expect(artifact.duration).toBe(120);
        expect(artifact.children).toEqual([]);
        expect(artifact.childIndex).toBeNull();
        expect(artifact.links).toEqual([]);
        expect(artifact.genres).toEqual([]);
        expect(artifact.ratings).toEqual([]);
        expect(artifact.tags).toEqual([]);
        expect(artifact.userInfo).toBeNull();
    });

    test('should compute mean rating correctly', () => {
        const rating1 = new Rating(RatingType.METACRITIC, 85);
        const rating2 = new Rating(RatingType.OPENCRITIC, 75);
        artifact.ratings = [rating1, rating2];

        expect(artifact.meanRating).toBe(80);
    });

    test('should get root parent correctly', () => {
        const child = new TestArtifact(2, 'Child', ArtifactType.MOVIE, currentDate, 60);
        const grandChild = new TestArtifact(3, 'Grandchild', ArtifactType.MOVIE, currentDate, 30);

        child.parent = artifact;
        grandChild.parent = child;

        expect(grandChild.rootParent).toBe(artifact);
        expect(child.rootParent).toBe(artifact);
        expect(artifact.rootParent).toBe(artifact);
    });

    test('should get artifact IDs recursively', () => {
        const child1 = new TestArtifact(2, 'Child 1', ArtifactType.MOVIE, currentDate, 60);
        const child2 = new TestArtifact(3, 'Child 2', ArtifactType.MOVIE, currentDate, 60);
        const grandChild = new TestArtifact(4, 'Grandchild', ArtifactType.MOVIE, currentDate, 30);

        artifact.children = [child1, child2];
        child1.children = [grandChild];

        expect(artifact.getArtifactIds()).toEqual([1, 2, 4, 3]);
    });

    test('should get artifact by ID recursively', () => {
        const child1 = new TestArtifact(2, 'Child 1', ArtifactType.MOVIE, currentDate, 60);
        const child2 = new TestArtifact(3, 'Child 2', ArtifactType.MOVIE, currentDate, 60);
        const grandChild = new TestArtifact(4, 'Grandchild', ArtifactType.MOVIE, currentDate, 30);

        artifact.children = [child1, child2];
        child1.children = [grandChild];

        expect(artifact.getArtifactById(4)).toBe(grandChild);
        expect(artifact.getArtifactById(999)).toBeNull();
    });

    test('should set user infos recursively', () => {
        const child = new TestArtifact(2, 'Child', ArtifactType.MOVIE, currentDate, 60);
        artifact.children = [child];

        const userInfos = {
            1: new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8, null, null),
            2: new UserArtifact(2, 2, UserArtifactStatus.ON_GOING, 7, null, null)
        };

        artifact.setUserInfos(userInfos);

        expect(artifact.userInfo).toBe(userInfos[1]);
        expect(child.userInfo).toBe(userInfos[2]);
    });

    test('should copy user infos from another artifact', () => {
        const sourceArtifact = new TestArtifact(1, 'Source', ArtifactType.MOVIE, currentDate, 120);
        const sourceChild = new TestArtifact(2, 'Source Child', ArtifactType.MOVIE, currentDate, 60);
        sourceArtifact.children = [sourceChild];

        const targetChild = new TestArtifact(2, 'Target Child', ArtifactType.MOVIE, currentDate, 60);
        artifact.children = [targetChild];

        sourceArtifact.userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8, null, null);
        sourceChild.userInfo = new UserArtifact(2, 2, UserArtifactStatus.ON_GOING, 7, null, null);

        artifact.copyUserInfos(sourceArtifact);

        expect(artifact.userInfo).toEqual(sourceArtifact.userInfo);
        expect(targetChild.userInfo).toEqual(sourceChild.userInfo);
    });

    test('should update user status recursively for FINISHED status', () => {
        const child = new TestArtifact(2, 'Child', ArtifactType.MOVIE, currentDate, 60);
        artifact.children = [child];

        artifact.updateUserStatus(UserArtifactStatus.FINISHED);

        expect(artifact.userInfo?.status).toBe(UserArtifactStatus.FINISHED);
        expect(child.userInfo?.status).toBe(UserArtifactStatus.FINISHED);
    });

    test('should update user status without affecting children for non-FINISHED status', () => {
        const child = new TestArtifact(2, 'Child', ArtifactType.MOVIE, currentDate, 60);
        artifact.children = [child];

        artifact.updateUserStatus(UserArtifactStatus.ON_GOING);

        expect(artifact.userInfo?.status).toBe(UserArtifactStatus.ON_GOING);
        expect(child.userInfo).toBeNull();
    });

    test('should update user score', () => {
        artifact.updateUserScore(8.5);
        expect(artifact.userInfo?.score).toBe(8.5);

        artifact.updateUserScore(null);
        expect(artifact.userInfo?.score).toBeNull();
    });

    test('should update user start date', () => {
        const startDate = new Date();
        artifact.updateUserStartDate(startDate);
        expect(artifact.userInfo?.startDate).toBe(startDate);

        artifact.updateUserStartDate(null);
        expect(artifact.userInfo?.startDate).toBeNull();
    });

    test('should update user end date', () => {
        const endDate = new Date();
        artifact.updateUserEndDate(endDate);
        expect(artifact.userInfo?.endDate).toBe(endDate);

        artifact.updateUserEndDate(null);
        expect(artifact.userInfo?.endDate).toBeNull();
    });

    test('should serialize to JSON', () => {
        const link = new Link(LinkType.METACRITIC, 'https://example.com');
        const genre = new Genre(1, 'Action');
        const rating = new Rating(RatingType.METACRITIC, 85);
        const tag = new Tag('tag1', TagType.DEFAULT);
        const userInfo = new UserArtifact(1, 1, UserArtifactStatus.FINISHED, 8.5, null, null);

        artifact.links = [link];
        artifact.genres = [genre];
        artifact.ratings = [rating];
        artifact.tags = [tag];
        artifact.userInfo = userInfo;

        const json = artifact.toJSON();

        expect(json).toEqual({
            __type: 'Artifact',
            id: 1,
            title: 'Test Artifact',
            type: ArtifactType.MOVIE,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 120,
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
            __type: 'Artifact',
            id: 1,
            title: 'Test Artifact',
            type: ArtifactType.MOVIE,
            children: [],
            childIndex: null,
            releaseDate: currentDate.toISOString(),
            duration: 120,
            links: [{ 
                __type: 'Link',
                type: LinkType.METACRITIC,
                url: 'https://example.com'
            }],
            genres: [{ 
                __type: 'Genre',
                id: 1,
                title: 'Action'
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

        const data = Artifact.fromJSON(json);

        expect(data.id).toBe(1);
        expect(data.title).toBe('Test Artifact');
        expect(data.type).toBe(ArtifactType.MOVIE);
        expect(data.releaseDate).toEqual(currentDate);
        expect(data.duration).toBe(120);
        expect(data.links[0]).toBeInstanceOf(Link);
        expect(data.genres[0]).toBeInstanceOf(Genre);
        expect(data.ratings[0]).toBeInstanceOf(Rating);
        expect(data.meanRating).toBe(85);
        expect(data.tags[0]).toBeInstanceOf(Tag);
        expect(data.userInfo).toBeInstanceOf(UserArtifact);
    });
});