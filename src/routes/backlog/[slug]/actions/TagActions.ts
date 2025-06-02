import type { BacklogItem } from "$lib/model/BacklogItem";
import { get } from "svelte/store";
import { pageStore } from "../stores/PageStore";
import { backlogStore, refreshBacklog } from "../stores/BacklogStore";
import { tagStore } from "../stores/TagStore";
import { Tag, type ITag } from "$lib/model/Tag";
import { createTag as createTagAPI, addTag as addTagAPI, removeTag as removeTagAPI } from "$lib/services/TagService";

export const fetchTags = async () => {
    const backlogStoreInst = get(backlogStore);
    const tagStoreInst = get(tagStore);

    const response = await fetch(`/api/tag/search?artifactType=${backlogStoreInst.backlog.artifactType}&query=${tagStoreInst.searchTagTerm}`);
    if (!response.ok) {
        throw new Error('Fetch Tags failed');
    }
    const tags = await response.json();
    const searchedTags = tags.map((tag: ITag) => Tag.fromJSON(tag));

    tagStore.update(s => ({
        ...s,
        searchedTags: searchedTags
    }));
}

export const createTag = async () => {
    const backlogStoreInst = get(backlogStore);
    const tagStoreInst = get(tagStore);
    createTagAPI(tagStoreInst.searchTagTerm, backlogStoreInst.backlog.artifactType).then(() => {
        fetchTags();
    });
}

export const addTag = (tagId: string) => {
    const backlogStoreInst = get(backlogStore);
    const pageStoreInst = get(pageStore);
    if (!pageStoreInst.selectedBacklogItem) {
        return;
    }
    addTagAPI(backlogStoreInst.backlog.id, pageStoreInst.selectedBacklogItem.artifact.id, tagId).then(() => {
        refreshBacklog();
    });
};

export const removeTag = (artifactId: number, tagId: string) => {
    const backlogStoreInst = get(backlogStore);
    removeTagAPI(backlogStoreInst.backlog.id, artifactId, tagId).then(() => {
        refreshBacklog();
    });
};


export const showAddTag = async (backlogItem: BacklogItem) => {
    await fetchTags();

    pageStore.update(s => ({
        ...s,
        selectedBacklogItem: backlogItem,
    }));
    tagStore.update(s => ({
        ...s,
        showAddTag: true
    }));
}

export const hideAddTag = async () => {
    tagStore.update(s => ({
        ...s,
        showAddTag: false
    }));
}