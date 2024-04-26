import { User } from "$lib/model/User";
import { BacklogDB } from "$lib/server/model/BacklogDB";
import { BacklogItemDB } from "$lib/server/model/BacklogItemDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ params, request, locals }: any) {
    const { user } = locals;
	const userInst = User.deserialize(user);
    const backlogId = parseInt(params.slug);
    const authorization = await BacklogDB.canEditBacklog(userInst, backlogId);
    if (authorization.status !== 200) {
        return error(authorization.status, authorization.message);
    }
	const { artifactId, tagId } = await request.json();
    await BacklogItemDB.addTag(backlogId, artifactId, tagId);
    return json({
        status: 201,
        body: { added: artifactId }
    });
}

export async function DELETE({ params, request, locals }: any) {
    const { user } = locals;
	const userInst = User.deserialize(user);
    const backlogId = parseInt(params.slug);
    const backlog = await BacklogDB.getBacklogById(backlogId);
    if (!backlog) {
        return json({
            status: 404,
            body: { error: "Backlog not found" }
        });
    }
    if (backlog.userId !== userInst.id) {
        return json({
            status: 403,
            body: { error: "Not authorized" }
        });
    }
    const { artifactId, tagId } = await request.json();
    await BacklogItemDB.removeTag(backlogId, artifactId, tagId);
    return json({
        status: 201,
        body: { added: artifactId }
    });
}