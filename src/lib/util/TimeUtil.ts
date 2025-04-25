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

    static formatDate(date: Date | null): string {
        if (!date) {
            return 'TBD';
        }
        if (date.getDate() === 31 && date.getMonth() === 11) {
            return date.getFullYear().toString();
        }
        if (date.getFullYear() >= 2100) {
            return 'TBD';
        }
        return date.toLocaleDateString();
    }
}