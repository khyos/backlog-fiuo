export class TimeUtil {
    static formatDuration(duration: number | null): string {
        if (duration === null) {
            return "N/A";
        }
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
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