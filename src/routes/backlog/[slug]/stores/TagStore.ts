import type { Tag } from '$lib/model/Tag';
import { writable } from 'svelte/store';

export type TagStore = {
    searchTagTerm: string
    searchedTags: Tag[]
    showAddTag: boolean
};

export const tagStore = writable<TagStore>({
    searchTagTerm: '',
    searchedTags: [],
    showAddTag: false
});