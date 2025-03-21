import { TagType } from "$lib/model/Tag";
import { TagDB } from "$lib/server/model/TagDB";
import { error, json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

export async function POST({ request }: RequestEvent) {
	const { id, artifactType } = await request.json();
    if (id.length < 2) {
        error(400, 'Tag name must be at least 2 characters');
    }
    try {
        const tag = await TagDB.createTag(id, artifactType, TagType.DEFAULT);
        return json(tag.toJSON());
    } catch (e) {
        return error(500, e instanceof Error ? e.message : 'Unknown Error');
    }
}