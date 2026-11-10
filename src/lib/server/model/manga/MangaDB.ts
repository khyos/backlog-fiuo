import { ArtifactType, type IArtifactDB } from "$lib/model/Artifact";
import { BacklogOrder, BacklogRankingType } from "$lib/model/Backlog";
import { BacklogItem } from "$lib/model/BacklogItem";
import { Genre } from "$lib/model/Genre";
import { Link } from "$lib/model/Link";
import { Rating } from "$lib/model/Rating";
import { Manga } from "$lib/model/manga/Manga";
import { MangaChapter } from "$lib/model/manga/MangaChapter";
import { MangaVolume } from "$lib/model/manga/MangaVolume";
import { runDbInsert } from "$lib/server/database";
import { ArtifactDB } from "../ArtifactDB";
import { BacklogItemDB } from "../BacklogItemDB";
import { LinkDB } from "../LinkDB";
import { RatingDB } from "../RatingDB";

export class MangaDB {
    // ========================================
    // Basic Getters
    // ========================================
    static async getById(id: number, fetchChildren: boolean = false): Promise<Manga | null> {
        const row = await ArtifactDB.getArtifactById(id);
        if (!row) return null;

        const releaseDate = new Date(row.releaseDate);
        const manga = new Manga(row.id, row.title, row.type, releaseDate, row.duration);

        manga.genres = await MangaDB.getAssignedGenres(id);
        manga.ratings = await RatingDB.getRatings(id);
        manga.links = await LinkDB.getLinks(id);

        if (fetchChildren) {
            await MangaDB.fetchChildren([manga]);
        }

        return manga;
    }

    static async getMangas(page: number, pageSize: number, search: string = ''): Promise<Manga[]> {
        return await ArtifactDB.getArtifacts(ArtifactType.MANGA, page, pageSize, search).then((rows: IArtifactDB[]) => {
            return rows.map((row: IArtifactDB) => MangaDB.deserialize(row));
        });
    }

    static deserialize(artifactJSON: IArtifactDB): Manga {
        const releaseDate = new Date(artifactJSON.releaseDate);
        return new Manga(artifactJSON.id, artifactJSON.title, artifactJSON.type, releaseDate, artifactJSON.duration);
    }

    // ========================================
    // Children/Relationship Fetchers
    // ========================================

    /**
     * Fetches direct children for each manga:
     * - MangaVolume rows → pushed into manga.children, then their chapters are fetched.
     * - Standalone MangaChapter rows → pushed into manga.children directly.
     */
    static async fetchChildren(mangas: Manga[]): Promise<void> {
        for (const manga of mangas) {
            const childRows = await ArtifactDB.getChildrenByParentId(manga.id);
            manga.children = [];
            for (const row of childRows) {
                const releaseDate = new Date(row.releaseDate);
                if (row.type === ArtifactType.MANGA_VOLUME) {
                    const volume = new MangaVolume(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
                    volume.parent = manga;
                    manga.children.push(volume);
                } else if (row.type === ArtifactType.MANGA_CHAPTER) {
                    const chapter = new MangaChapter(row.id, row.child_index, row.title, row.type, releaseDate, row.duration);
                    chapter.parent = manga;
                    manga.children.push(chapter);
                }
            }
            // Fetch chapters for each volume
            for (const volume of manga.volumes) {
                const chapterRows = await ArtifactDB.getChildrenByParentId(volume.id);
                volume.children = chapterRows.map((row: IArtifactDB) => {
                    const chapter = new MangaChapter(row.id, row.child_index, row.title, row.type, new Date(row.releaseDate), row.duration);
                    chapter.parent = volume;
                    return chapter;
                });
            }
        }
    }

    // ========================================
    // Genre Methods
    // ========================================
    static async getGenreDefinitions(): Promise<Genre[]> {
        return await ArtifactDB.getGenreDefinitions('manga_genre');
    }

    static addGenreDefinition(genreId: number, title: string): Promise<void> {
        return ArtifactDB.addGenreDefinition(genreId, title, 'manga_genre');
    }

    static async getAssignedGenres(mangaId: number): Promise<Genre[]> {
        return await ArtifactDB.getAssignedGenres(mangaId, 'manga_genre', 'manga_manga_genre');
    }

    static async assignGenre(mangaId: number, genreId: number): Promise<void> {
        return await ArtifactDB.assignGenre(mangaId, genreId, 'manga_manga_genre');
    }

    static async updateAssignedGenres(mangaId: number, genreIds: number[]): Promise<void> {
        return await ArtifactDB.updateAssignedGenres(mangaId, genreIds, MangaDB.getAssignedGenres, 'manga_manga_genre');
    }

    static async unassignGenre(mangaId: number, genreId: number): Promise<void> {
        return await ArtifactDB.unassignGenre(mangaId, genreId, 'manga_manga_genre');
    }

    // ========================================
    // User-related Methods
    // ========================================
    static async getUserOngoingMangas(userId: number, fetchOnhold: boolean = false): Promise<Manga[]> {
        const rows = await ArtifactDB.getUserOngoingArtifacts(userId, ArtifactType.MANGA, fetchOnhold);
        const mangas: Manga[] = rows.map((row) => {
            const releaseDate = new Date(row.releaseDate);
            return new Manga(row.id, row.title, row.type, releaseDate, row.duration);
        });
        await this.fetchChildren(mangas);
        return mangas;
    }

    static async getBacklogItems(backlogId: number, rankingType: BacklogRankingType, backlogOrder: BacklogOrder): Promise<BacklogItem[]> {
        const dbBacklogItems = await ArtifactDB.getBacklogItems(backlogId, rankingType, backlogOrder);

        const backlogItems: BacklogItem[] = await Promise.all(dbBacklogItems.map(async row => {
            const releaseDate = new Date(row.releaseDate);
            const manga = new Manga(row.artifactId, row.title, row.type, releaseDate, row.duration);
            manga.genres = await MangaDB.getAssignedGenres(row.artifactId);
            manga.ratings = await RatingDB.getRatings(row.artifactId);
            const tags = await BacklogItemDB.getTags(row.backlogId, ArtifactType.MANGA, row.artifactId);
            return new BacklogItem(row.rank, row.elo, row.dateAdded, manga, tags);
        }));

        return backlogItems;
    }

    // ========================================
    // Create Operations
    // ========================================
    static async createManga(title: string, description: string = '', releaseDate: Date = new Date(), duration: number = 0, genreIds: number[], links: Link[], ratings: Rating[]): Promise<Manga> {
        const mangaId = await ArtifactDB.createArtifact(title, ArtifactType.MANGA, description, releaseDate, duration);

        for (const genreId of genreIds) {
            await MangaDB.assignGenre(mangaId, genreId);
        }

        for (const link of links) {
            await LinkDB.addLink(mangaId, link.type, link.url);
        }

        for (const rating of ratings) {
            await RatingDB.addRating(mangaId, rating.type, rating.rating);
        }

        const manga = new Manga(mangaId, title, ArtifactType.MANGA, releaseDate, duration);
        manga.genres = await MangaDB.getAssignedGenres(mangaId);
        manga.links = links;
        manga.ratings = ratings;
        return manga;
    }

    static async createMangaVolume(mangaId: number, volumeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<MangaVolume> {
        const mangaVolumeId = await runDbInsert(
            `INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, ArtifactType.MANGA_VOLUME, mangaId, volumeNumber, releaseDate.getTime(), duration]
        );
        return new MangaVolume(mangaVolumeId, volumeNumber, title, ArtifactType.MANGA_VOLUME, releaseDate, duration);
    }

    static async createMangaChapter(parentId: number, chapterNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<MangaChapter> {
        const mangaChapterId = await runDbInsert(
            `INSERT INTO artifact (title, type, parent_artifact_id, child_index, releaseDate, duration) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, ArtifactType.MANGA_CHAPTER, parentId, chapterNumber, releaseDate.getTime(), duration]
        );
        return new MangaChapter(mangaChapterId, chapterNumber, title, ArtifactType.MANGA_CHAPTER, releaseDate, duration);
    }

    // ========================================
    // Update Operations
    // ========================================
    static async updateManga(id: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifact(id, title, releaseDate, duration);
    }

    static async updateMangaVolume(mangaVolumeId: number, volumeNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifactWithIndex(mangaVolumeId, volumeNumber, title, releaseDate, duration);
    }

    static async updateMangaChapter(mangaChapterId: number, chapterNumber: number, title: string, releaseDate: Date = new Date(7258118400000), duration: number = 0): Promise<void> {
        return await ArtifactDB.updateArtifactWithIndex(mangaChapterId, chapterNumber, title, releaseDate, duration);
    }

    // ========================================
    // Delete Operations
    // ========================================
    static async deleteManga(id: number) {
        const manga = await MangaDB.getById(id, true);
        if (manga) {
            await ArtifactDB.deleteArtifactAndChildren(manga, 'manga_manga_genre');
        }
    }

    static async deleteMangaVolume(id: number) {
        return await ArtifactDB.deleteChildArtifact(id);
    }

    static async deleteMangaChapter(id: number) {
        return await ArtifactDB.deleteChildArtifact(id);
    }

    // ========================================
    // Table Creation Methods
    // ========================================
    static async createMangaGenreTable() {
        await ArtifactDB.createGenreTable('manga_genre');
    }

    static async createMangaMangaGenreTable() {
        await ArtifactDB.createGenreMapTable('manga_manga_genre');
    }
}
