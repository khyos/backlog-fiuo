export class UserArtifact {
    userId: number
    artifactId: number
    score: number | null
    startDate: Date | null
    endDate: Date | null

    constructor(userId: number, artifactId: number, score: number | null, startDate: Date | null, endDate: Date | null) {
        this.userId = userId;
        this.artifactId = artifactId;
        this.score = score;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    serialize() {
        return {
            userId: this.userId,
            artifactId: this.artifactId,
            score: this.score,
            startDate: this.startDate?.toISOString(),
            endDate: this.endDate?.toISOString()
        }
    }

    static deserialize(data: any): any {
        return {
            userId: data.userId,
            artifactId: data.artifactId,
            score: data.score,
            startDate: new Date(data.releaseDate),
            endDate: new Date(data.releaseDate)
        }
    }
}