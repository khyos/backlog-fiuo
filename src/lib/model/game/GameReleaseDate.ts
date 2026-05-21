export interface IGameReleaseDate {
    platformId?: number
    releaseDate: number
    status?: string
}

export interface IGameReleaseDateDB {
    id: number
    artifactId: number
    platformId?: number
    releaseDate: number
    status?: string
}
