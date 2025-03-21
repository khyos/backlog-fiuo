import { TagDB } from "$lib/server/model/TagDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { ArtifactType } from "$lib/model/Artifact";

export async function GET({ url }: RequestEvent) {
    const artifactType = url.searchParams.get('artifactType') as ArtifactType | null;
    if (artifactType === null) {
        return error(500, 'artifactType should not be null');
    } else if (!Object.values(ArtifactType).includes(artifactType)) {
        return error(500, 'invalid artifactType');
    }
    const page : number = parseInt(url.searchParams.get('page') ?? '0', 10);
    const pageSize : number = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const query : string = url.searchParams.get('query') ?? '';
    const tags = await TagDB.getTags(artifactType, page, pageSize, query);
    const serializedTags = tags.map((tag) => tag.toJSON());
    return json(serializedTags);
}