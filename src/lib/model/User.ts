export enum UserRole {
    ADMIN = 'admin',
    CONTRIBUTOR = 'contributor',
    USER = 'user',
    GUEST = 'guest'
}

export function getUserRights(role: UserRole) {
    switch (role) {
        case UserRole.ADMIN:
            return [
                UserRights.CREATE_ARTIFACT, UserRights.DELETE_ARTIFACT, UserRights.EDIT_ARTIFACT,
                UserRights.CREATE_BACKLOG, UserRights.EDIT_BACKLOG, UserRights.DELETE_BACKLOG,
                UserRights.EDIT_ALL_BACKLOGS, UserRights.DELETE_ALL_BACKLOGS, UserRights.BOOTSTRAP
            ];
        case UserRole.CONTRIBUTOR:
            return [
                UserRights.CREATE_ARTIFACT, UserRights.EDIT_ARTIFACT,
                UserRights.CREATE_BACKLOG, UserRights.EDIT_BACKLOG, UserRights.DELETE_BACKLOG
            ];
        case UserRole.USER:
            return [UserRights.CREATE_BACKLOG, UserRights.EDIT_BACKLOG, UserRights.DELETE_BACKLOG];
        case UserRole.GUEST:
            return [];
        default:
            return [];
    }
}

export enum UserRights {
    CREATE_ARTIFACT = 'create_artifact',
    DELETE_ARTIFACT = 'delete_artifact',
    EDIT_ARTIFACT = 'edit_artifact',

    CREATE_BACKLOG = 'create_backlog',
    EDIT_BACKLOG = 'edit_backlog',
    DELETE_BACKLOG = 'delete_backlog',
    EDIT_ALL_BACKLOGS = 'edit_all_backlogs',
    DELETE_ALL_BACKLOGS = 'delete_all_backlogs',

    BOOTSTRAP = 'bootstrap'
}

export class User {
    id: number
    username: string
    role: UserRole

    constructor(id: number, username: string, role: UserRole) {
        this.id = id;
        this.username = username;
        this.role = role;
    }

    serialize() {
        return {
            id: this.id,
            username: this.username,
            role: this.role
        }
    }

    hasRight(right: UserRights) {
        return getUserRights(this.role).includes(right);
    }

    static deserialize(data: any) : User {
        if (!data) {
            return new User(-1, '', UserRole.GUEST);
        }
        return new User(data.id, data.username, data.role);
    }
}