export class TimeUtil {
    static formatDuration(duration: number): string {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        let formattedDuration = "";
        if (hours > 0) {
            formattedDuration += `${hours}h `;
        }
        if (minutes > 0) {
            formattedDuration += `${minutes}m`;
        }
        return formattedDuration;
    }
}