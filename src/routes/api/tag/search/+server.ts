import { TagDB } from "$lib/server/model/TagDB";
import { json } from "@sveltejs/kit";

export async function GET({ url }: any) {
    const artifactType : string = url.searchParams.get('artifactType');
    const page : number = url.searchParams.get('page') ?? 0;
    const pageSize : number = url.searchParams.get('pageSize') ?? 10;
    const query : string = url.searchParams.get('query') ?? '';
    const tags = await TagDB.getTags(artifactType, page, pageSize, query);
    const serializedTags = tags.map((tag) => tag.serialize());
    return json(serializedTags);
}