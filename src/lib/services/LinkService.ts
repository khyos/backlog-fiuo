import { ArtifactType } from "$lib/model/Artifact";
import type { LinkType } from "$lib/model/Link";

export function openLink(artifactType: ArtifactType, linkType: LinkType, linkUrl: string) {
    fetch(`/api/link/getUrl?artifactType=${artifactType}&linkType=${linkType}&linkUrl=${linkUrl}`, {
        method: "GET",
    }).then((res) => res.text())
    .then((response) => {
        window.open(response, "blank_");
    });
};