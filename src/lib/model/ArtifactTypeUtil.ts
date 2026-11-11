import { ArtifactType } from "./Artifact";

export class ArtifactTypeUtil {
    static getChildName(artifactType: ArtifactType, index: number): string | null {
        if (artifactType === ArtifactType.TVSHOW) {
            if (index === 0) {
                return 'Season';
            }
            if (index === 1) {
                return 'Episode';
            }
        }
        if (artifactType === ArtifactType.ANIME) {
            if (index === 0) {
                return 'Episode';
            }
        }
        if (artifactType === ArtifactType.MANGA) {
            if (index === 0) {
                return 'Chapter';
            }
        }
        return null;
    }

    static getChildrenDepth(artifactType: ArtifactType): number {
        if (artifactType === ArtifactType.TVSHOW) {
            return 2;
        }
        if (artifactType === ArtifactType.ANIME) {
            return 1;
        }
        if (artifactType === ArtifactType.MANGA) {
            return 1;
        }
        return 0;
    }

    /**
     * Returns true for artifact types whose children are split into two parallel flat lists
     * (e.g. Manga has both Volumes and Chapters as independent direct children).
     */
    static hasParallelChildren(artifactType: ArtifactType): boolean {
        return artifactType === ArtifactType.MANGA;
    }

    /**
     * Returns the labelled sections for artifact types with parallel children.
     * Each section has a display label and the child ArtifactType to filter by.
     */
    static getParallelChildSections(artifactType: ArtifactType): Array<{ label: string; type: ArtifactType }> {
        if (artifactType === ArtifactType.MANGA) {
            return [
                { label: 'Volumes', type: ArtifactType.MANGA_VOLUME },
                { label: 'Chapters', type: ArtifactType.MANGA_CHAPTER },
            ];
        }
        return [];
    }
};