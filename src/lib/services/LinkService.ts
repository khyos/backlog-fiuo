import { ArtifactType } from "$lib/model/Artifact";
import type { LinkType } from "$lib/model/Link";

export async function openLink(artifactType: ArtifactType, linkType: LinkType, linkUrl: string): Promise<void> {
    const res = await fetch(`/api/link/getUrl?artifactType=${artifactType}&linkType=${linkType}&linkUrl=${linkUrl}`, {
        method: "GET",
    });
    const data = await res.json();
    window.open(data.url, "_blank");
};