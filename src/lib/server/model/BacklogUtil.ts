import { ArtifactType } from "$lib/model/Artifact";
import type { Backlog } from "$lib/model/Backlog";
import type { Tag } from "$lib/model/Tag";
import { User, UserRights } from "$lib/model/User";
import { AnimeDB } from "./anime/AnimeDB";
import { BacklogDB } from "./BacklogDB";
import { GameDB } from "./game/GameDB";
import { MovieDB } from "./movie/MovieDB";
import { TvshowDB } from "./tvshow/TvshowDB";

export class BacklogUtil {
    static extractUniqueTagsFromBacklog(backlog: Backlog) {
        const backlogTags: Tag[] = [];
        
        for (const item of backlog.backlogItems) {
            for (const tag of item.tags) {
                if (!backlogTags.some(backlogTag => backlogTag.id === tag.id)) {
                    backlogTags.push(tag);
                }
            }
        }
        
        return backlogTags;
    }

    static async fetchGenres(artifactType: ArtifactType) {
        if (artifactType === ArtifactType.ANIME) {
            return await AnimeDB.getGenreDefinitions();
        }
        else if (artifactType === ArtifactType.GAME) {
            return await GameDB.getGenreDefinitions();
        } 
        else if (artifactType === ArtifactType.MOVIE) {
            return await MovieDB.getGenreDefinitions();
        }
        else if (artifactType === ArtifactType.TVSHOW) {
            return await TvshowDB.getGenreDefinitions();
        }
        return [];
    }

    static async fetchPlatforms(artifactType: ArtifactType) {
        if (artifactType === ArtifactType.GAME) {
            return await GameDB.getAllPlatforms();
        } 
        return [];
    }

    static async loadBacklogPageInfo(backlogId: number, locals: App.Locals) {
        const user = User.deserialize(locals.user);
        
        const backlog = await BacklogDB.getBacklogByIdWithItems(backlogId);
        if (!backlog) {
            return null;
        }
    
        const backlogTags = BacklogUtil.extractUniqueTagsFromBacklog(backlog);
        const genres = await BacklogUtil.fetchGenres(backlog.artifactType);
        const platforms = await BacklogUtil.fetchPlatforms(backlog.artifactType);
        
        return {
            backlog: backlog.toJSON(),
            backlogTags: backlogTags.map(backlogTag => backlogTag.toJSON()),
            genres: genres.map(genre => genre.toJSON()),
            platforms: platforms.map(platform => platform.toJSON()),
            canEdit: user.hasRight(UserRights.EDIT_BACKLOG) && backlog.userId === user.id
        };
    }
}