import { describe, expect, it } from 'vitest';
import { ArtifactType } from '../Artifact';
import { UserArtifactStatus } from '../UserArtifact';
import { Manga } from './Manga';
import { MangaChapter } from './MangaChapter';
import { MangaVolume } from './MangaVolume';

function createVolume(id: number, childIndex: number): MangaVolume {
    return new MangaVolume(id, childIndex, `Volume ${childIndex}`, ArtifactType.MANGA_VOLUME, new Date(), 0);
}

function createChapter(id: number, childIndex: number): MangaChapter {
    return new MangaChapter(id, childIndex, `Chapter ${childIndex}`, ArtifactType.MANGA_CHAPTER, new Date(), 0);
}

describe('Manga ongoing tracking progress', () => {
    it('tracks volumes and chapters independently by child type', () => {
        const manga = new Manga(1, 'Manga', ArtifactType.MANGA, new Date(), 0);
        const firstVolume = createVolume(2, 1);
        const secondVolume = createVolume(3, 2);
        const firstChapter = createChapter(4, 1);
        const secondChapter = createChapter(5, 2);
        manga.children = [firstVolume, firstChapter, secondVolume, secondChapter];
        firstVolume.updateUserStatus(UserArtifactStatus.FINISHED);
        firstChapter.updateUserStatus(UserArtifactStatus.FINISHED);

        const result = manga.getOngoingTrackingProgress();
        const volumeProgress = result.find((progress) => progress.childType === ArtifactType.MANGA_VOLUME);
        const chapterProgress = result.find((progress) => progress.childType === ArtifactType.MANGA_CHAPTER);

        expect(volumeProgress).toEqual({ childType: ArtifactType.MANGA_VOLUME, last: firstVolume, next: secondVolume });
        expect(chapterProgress).toEqual({ childType: ArtifactType.MANGA_CHAPTER, last: firstChapter, next: secondChapter });
    });
});
