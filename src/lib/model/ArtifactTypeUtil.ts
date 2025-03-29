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
        return null;
    }
};