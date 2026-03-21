export type Period = 'week' | 'month' | 'year' | 'decade' | 'all-time';

export type PeriodBounds = {
    start: number;  // inclusive timestamp ms
    end: number;    // inclusive timestamp ms
    label: string;
    canGoForward: boolean;
};

export function getPeriodBounds(period: Period, offset: number, earliestDate?: number): PeriodBounds {
    const now = new Date();

    switch (period) {
        case 'week': {
            const daysFromMonday = (now.getDay() + 6) % 7;
            const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday + offset * 7);
            const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
            return {
                start: monday.getTime(),
                end: sunday.getTime(),
                label: formatWeekLabel(monday, sunday),
                canGoForward: offset < 0
            };
        }
        case 'month': {
            const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
            return {
                start: d.getTime(),
                end: end.getTime(),
                label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
                canGoForward: offset < 0
            };
        }
        case 'year': {
            const year = now.getFullYear() + offset;
            return {
                start: new Date(year, 0, 1).getTime(),
                end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
                label: `${year}`,
                canGoForward: offset < 0
            };
        }
        case 'decade': {
            const decade = Math.floor(now.getFullYear() / 10) * 10 + offset * 10;
            return {
                start: new Date(decade, 0, 1).getTime(),
                end: new Date(decade + 9, 11, 31, 23, 59, 59, 999).getTime(),
                label: `${decade}s`,
                canGoForward: offset < 0
            };
        }
        case 'all-time': {
            return {
                start: earliestDate ?? 0,
                end: now.getTime(),
                label: 'All Time',
                canGoForward: false
            };
        }
    }
}

function formatWeekLabel(monday: Date, sunday: Date): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()}–${sunday.getDate()} ${monday.toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    }
    return `${monday.toLocaleString('default', opts)} – ${sunday.toLocaleString('default', { ...opts, year: 'numeric' })}`;
}

export type SubPeriod = { label: string; displayLabel: boolean; start: number; end: number };

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function getSubPeriods(period: Period, bounds: PeriodBounds): SubPeriod[] {
    const d = new Date(bounds.start);
    switch (period) {
        case 'decade': {
            const startY = d.getFullYear();
            return Array.from({ length: 10 }, (_, i) => {
                const y = startY + i;
                return {
                    label: `${y}`,
                    displayLabel: true,
                    start: new Date(y, 0, 1).getTime(),
                    end:   new Date(y, 11, 31, 23, 59, 59, 999).getTime()
                };
            });
        }
        case 'year': {
            const y = d.getFullYear();
            return Array.from({ length: 12 }, (_, i) => ({
                label: MONTH_SHORT[i],
                displayLabel: true,
                start: new Date(y, i, 1).getTime(),
                end:   new Date(y, i + 1, 0, 23, 59, 59, 999).getTime()
            }));
        }
        case 'month': {
            const y = d.getFullYear();
            const m = d.getMonth();
            const days = new Date(y, m + 1, 0).getDate();
            return Array.from({ length: days }, (_, i) => ({
                label: `${i + 1}`,
                displayLabel: true,
                start: new Date(y, m, i + 1).getTime(),
                end:   new Date(y, m, i + 1, 23, 59, 59, 999).getTime()
            }));
        }
        case 'week': {
            return Array.from({ length: 7 }, (_, i) => {
                const s = bounds.start + i * 86_400_000;
                return { label: DAY_SHORT[i], displayLabel: true, start: s, end: s + 86_400_000 - 1 };
            });
        }
        case 'all-time': {
            const startY = new Date(bounds.start).getFullYear();
            const endY = new Date(bounds.end).getFullYear();
            const totalYears = endY - startY + 1;
            const interval = Math.max(1, Math.ceil(totalYears / 10));
            const years: SubPeriod[] = [];
            for (let y = startY; y <= endY; y++) {
                years.push({
                    label: `${y}`,
                    displayLabel: (y - startY) % interval === 0 || y === endY,
                    start: new Date(y, 0, 1).getTime(),
                    end: new Date(y, 11, 31, 23, 59, 59, 999).getTime()
                });
            }
            return years;
        }
    }
}
