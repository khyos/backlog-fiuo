import { ArtifactType } from "#lib/model/Artifact";
import { User, UserRights } from "#lib/model/User";
import { ArtifactDB } from "./ArtifactDB";
import { BacklogDB } from "./BacklogDB";
import { TierListDB } from "./TierListDB";

export interface IArtifactSummary {
    id: number;
    title: string;
    type: ArtifactType;
}

export const DEFAULT_TIERS: { label: string; color: string }[] = [
    { label: 'S', color: '#ff7f7f' },
    { label: 'A', color: '#ffbf7f' },
    { label: 'B', color: '#ffff7f' },
    { label: 'C', color: '#7fff7f' },
    { label: 'D', color: '#7fbfff' },
    { label: 'F', color: '#bf7fff' },
];

export class TierListUtil {
    static tierIndexForScore(score: number | null): number | null {
        if (score === null || score === undefined) {
            return null;
        }
        if (score >= 90) return 0;
        if (score >= 80) return 1;
        if (score >= 70) return 2;
        if (score >= 60) return 3;
        if (score >= 50) return 4;
        return 5;
    }

    static async createTierListFromBacklog(user: User, backlogId: number): Promise<number | null> {
        const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
        if (!backlog) {
            return null;
        }

        const tierListId = await TierListDB.insertTierList(user.id, backlog.id, backlog.artifactType, backlog.title);

        const tierIds: number[] = [];
        for (let i = 0; i < DEFAULT_TIERS.length; i++) {
            const tierId = await TierListDB.insertTier(tierListId, DEFAULT_TIERS[i].label, DEFAULT_TIERS[i].color, i);
            tierIds.push(tierId);
        }

        const artifactIds = backlog.backlogItems.map(item => item.artifact.id);
        const userInfos = await ArtifactDB.getUserInfos(backlog.userId, artifactIds);
        const scoreMap = new Map<number, number | null>();
        for (const userInfo of userInfos) {
            scoreMap.set(userInfo.artifactId, userInfo.score);
        }

        const positions = new Map<number | null, number>();
        const nextPosition = (tierId: number | null) => {
            const position = positions.get(tierId) ?? 0;
            positions.set(tierId, position + 1);
            return position;
        };

        for (const item of backlog.backlogItems) {
            const score = scoreMap.get(item.artifact.id) ?? null;
            const tierIndex = TierListUtil.tierIndexForScore(score);
            const tierId = tierIndex === null ? null : tierIds[tierIndex];
            await TierListDB.insertItem(tierListId, item.artifact.id, tierId, nextPosition(tierId));
        }

        return tierListId;
    }

    static async loadTierListPageInfo(id: number, locals: App.Locals) {
        const user = User.deserialize(locals.user);
        const tierList = await TierListDB.getTierListByIdWithItems(id);
        if (!tierList) {
            return null;
        }
        return {
            tierList: tierList.toJSON(),
            canEdit: user.hasRight(UserRights.EDIT_BACKLOG) && tierList.userId === user.id
        };
    }

    static async refreshFromBacklog(tierListId: number): Promise<{ added: IArtifactSummary[]; removalCandidates: IArtifactSummary[] }> {
        const tierList = await TierListDB.getTierListById(tierListId);
        if (!tierList) {
            return { added: [], removalCandidates: [] };
        }

        const backlog = tierList.backlogId != null
            ? await BacklogDB.getBacklogByIdWithItems(tierList.backlogId)
            : null;
        const backlogArtifactIds = new Set((backlog?.backlogItems ?? []).map(item => item.artifact.id));
        const existingArtifactIds = new Set(await TierListDB.getItemArtifactIds(tierListId));

        const addedIds = [...backlogArtifactIds].filter(id => !existingArtifactIds.has(id));
        const removalIds = [...existingArtifactIds].filter(id => !backlogArtifactIds.has(id));

        await TierListDB.addUnrankedItems(tierListId, addedIds);

        const added: IArtifactSummary[] = (backlog?.backlogItems ?? [])
            .filter(item => addedIds.includes(item.artifact.id))
            .map(item => ({ id: item.artifact.id, title: item.artifact.title, type: item.artifact.type }));

        const removalCandidates: IArtifactSummary[] = [];
        for (const id of removalIds) {
            const artifact = await ArtifactDB.getArtifactById(id);
            if (artifact) {
                removalCandidates.push({ id: artifact.id, title: artifact.title, type: artifact.type });
            }
        }

        return { added, removalCandidates };
    }
}
