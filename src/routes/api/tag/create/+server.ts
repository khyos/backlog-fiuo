import { TagType } from "$lib/model/Tag";
import { TagDB } from "$lib/server/model/TagDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ request }: any) {
	const { id, artifactType } = await request.json();
    if (id.length < 2) {
        error(400, 'Tag name must be at least 2 characters');
    }
    try {
        const tag = await TagDB.createTag(id, artifactType, TagType.DEFAULT);
        return json(tag.serialize());
    } catch (e: any) {
        return error(500, e.message);
    }
}