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
        return null;
    }

    static getChildrenDepth(artifactType: ArtifactType): number {
        if (artifactType === ArtifactType.TVSHOW) {
            return 2;
        }
        if (artifactType === ArtifactType.ANIME) {
            return 1;
        }
        return 0;
    }
};