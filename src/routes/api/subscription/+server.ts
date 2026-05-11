import { ArtifactType } from "$lib/model/Artifact";
import { SubscriptionServiceDB } from "$lib/server/model/SubscriptionServiceDB";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function GET({ url }: RequestEvent) {
    const artifactTypeParam = url.searchParams.get('artifactType');
    const artifactType = artifactTypeParam && Object.values(ArtifactType).includes(artifactTypeParam as ArtifactType)
        ? (artifactTypeParam as ArtifactType)
        : undefined;
    const services = await SubscriptionServiceDB.getAllServices(artifactType);
    return json(services.map(s => s.toJSON()));
}
