import { User } from "$lib/model/User";
import { ArtifactDB } from "$lib/server/model/ArtifactDB";
import { error, json } from "@sveltejs/kit";

export async function POST({ params, request, locals }: any) {
    const { user } = locals;
    const userInst = User.deserialize(user);
    if (userInst.id < 0) {
        error(500, "invalid user");
    }
    const artifactId = parseInt(params.slug);
    const { score } = await request.json();
    if (score < 0 || score > 100) {
        error(500, "invalid score");
    } 
    ArtifactDB.setUserScore(userInst.id, artifactId, score);
    
    return json({ success: true });
}