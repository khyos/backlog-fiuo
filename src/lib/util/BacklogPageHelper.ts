import { Tag, TagType } from "$lib/model/Tag";
import { Genre } from "$lib/model/Genre";
import { Platform } from "$lib/model/game/Platform";
import type { Price } from "$lib/types/itad/Price";
import { fetchPrices } from "$lib/services/PricesService";
import { ArtifactType } from "$lib/model/Artifact";
import type { BacklogItem } from "$lib/model/BacklogItem";

export interface BacklogPageData {
    backlogTags: {
        id: string;
        type: TagType;
    }[];
    genres: {
        id: number;
        title: string;
    }[];
    platforms: {
        id: number;
        title: string;
    }[];
    canEdit: boolean;
}

export class BacklogPageHelper {
    static convertModelInstances(data: BacklogPageData) {
        return {
            genres: data.genres.map(g => new Genre(g.id, g.title)),
            backlogTags: data.backlogTags.map(t => new Tag(t.id, t.type)),
            platforms: data.platforms.map(p => new Platform(p.id, p.title))
        };
    }

    static createBacklogItemsForSelect(backlogItems: BacklogItem[]) {
        return backlogItems.map((bi) => ({
            value: bi.rank,
            name: `${bi.rank} - ${bi.artifact.title}`
        }));
    }

    static async fetchPricesForBacklog(artifactType: ArtifactType, backlogItems: BacklogItem[]): Promise<Record<string, Price>> {
        if (artifactType === ArtifactType.GAME) {
            const artifactIds = backlogItems.map((item) => item.artifact.id);
            return await fetchPrices(artifactType, artifactIds);
        }
        return {};
    }
}