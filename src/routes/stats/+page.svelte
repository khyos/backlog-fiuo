<script lang="ts">
    import { Button, ButtonGroup, Card } from "flowbite-svelte";
    import { ChevronLeftOutline, ChevronRightOutline } from "flowbite-svelte-icons";
    import type { PageData } from "./$types";
    import type { StatEntry } from "./+page.server";
    import { ArtifactType } from "$lib/model/Artifact";
    import { UserArtifactStatus } from "$lib/model/UserArtifact";
    import { TimeUtil } from "$lib/util/TimeUtil";
    import { getPeriodBounds, getSubPeriods, type Period, type SubPeriod } from "$lib/util/PeriodUtil";
    import BarChart from "$lib/ui/BarChart.svelte";

    export let data: PageData;

    let selectedPeriod: Period = 'month';
    let offset = 0;

    const PERIOD_LABEL: Record<Period, string> = {
        week: 'Week',
        month: 'Month',
        year: 'Year',
        decade: 'Decade',
        'all-time': 'All Time'
    };

    const ARTIFACT_LABELS: Record<string, string> = {
        [ArtifactType.GAME]: 'Games',
        [ArtifactType.MOVIE]: 'Movies',
        [ArtifactType.TVSHOW]: 'TV Shows',
        [ArtifactType.ANIME]: 'Anime'
    };

    const STATUS_LABEL: Record<string, string> = {
        [UserArtifactStatus.FINISHED]: 'Finished',
        [UserArtifactStatus.DROPPED]: 'Dropped',
        [UserArtifactStatus.ON_GOING]: 'Ongoing',
        [UserArtifactStatus.ON_HOLD]: 'On Hold',
        [UserArtifactStatus.WISHLIST]: 'Wishlist'
    };

    const MAIN_TYPES = [ArtifactType.GAME, ArtifactType.MOVIE, ArtifactType.TVSHOW, ArtifactType.ANIME];

    const TYPE_COLOR: Record<string, string> = {
        [ArtifactType.GAME]:           '#3b82f6',
        [ArtifactType.MOVIE]:          '#f97316',
        [ArtifactType.TVSHOW]:         '#10b981',
        [ArtifactType.ANIME]:          '#8b5cf6',
        [ArtifactType.TVSHOW_EPISODE]: '#10b981',
        [ArtifactType.ANIME_EPISODE]:  '#8b5cf6'
    };

    const EPISODE_TYPE: Record<string, ArtifactType> = {
        [ArtifactType.TVSHOW]: ArtifactType.TVSHOW_EPISODE,
        [ArtifactType.ANIME]:  ArtifactType.ANIME_EPISODE
    };

    const SUB_PERIOD_LABEL: Record<Period, string> = {
        week:      'per day',
        month:     'per day',
        year:      'per month',
        decade:    'per year',
        'all-time': 'per year'
    };

    function selectPeriod(p: Period) {
        selectedPeriod = p;
        offset = 0;
    }

    function countInPeriod(entries: StatEntry[], type: ArtifactType, start: number, end: number) {
        return entries.filter(e => {
            if (e.type !== type || !e.endDate) return false;
            const ts = Date.parse(e.endDate);
            return ts >= start && ts <= end;
        }).length;
    }

    function computeStats(entries: StatEntry[], start: number, end: number, subPeriods: SubPeriod[]) {
        return MAIN_TYPES.map(type => {
            const typeEntries = entries.filter(e => e.type === type);

            const finishedInPeriod = typeEntries.filter(e => {
                if (e.status !== UserArtifactStatus.FINISHED || !e.endDate) return false;
                const ts = Date.parse(e.endDate);
                return ts >= start && ts <= end;
            });

            const totalDuration = finishedInPeriod.reduce((acc, e) => acc + (e.duration ?? 0), 0);

            const scoredEntries = finishedInPeriod.filter(e => e.score !== null && e.score > 0);
            const averageScore = scoredEntries.length > 0
                ? scoredEntries.reduce((acc, e) => acc + (e.score ?? 0), 0) / scoredEntries.length
                : null;

            const statusCounts = Object.values(UserArtifactStatus).map(status => ({
                status,
                label: STATUS_LABEL[status],
                count: typeEntries.filter(e => e.status === status).length
            })).filter(s => s.count > 0);

            const bars = subPeriods.map(sp => ({
                label: sp.label,
                showLabel: sp.displayLabel ?? false,
                value: countInPeriod(entries, type, sp.start, sp.end)
            }));

            // Episode stats for anime / tvshow
            const epType = EPISODE_TYPE[type];
            let episodeCount: number | null = null;
            let episodeBars: { label: string; showLabel: boolean; value: number }[] | null = null;
            if (epType) {
                episodeCount = countInPeriod(entries, epType, start, end);
                episodeBars = subPeriods.map(sp => ({
                    label: sp.label,
                    showLabel: sp.displayLabel ?? false,
                    value: countInPeriod(entries, epType, sp.start, sp.end)
                }));
            }

        // Split anime into short (≤2 episodes) and regular (>2 episodes)
        type AnimeBars = { finishedCount: number; totalDuration: number; bars: { label: string; showLabel: boolean; value: number }[] };
        let animeShort: AnimeBars | null = null;
        let animeRegular: AnimeBars | null = null;
        if (type === ArtifactType.ANIME) {
            const isShort = (e: StatEntry) => (e.episodeCount ?? 0) <= 2;
            const shortFinished = finishedInPeriod.filter(isShort);
            const regularFinished = finishedInPeriod.filter(e => !isShort(e));
            const finishedTypeEntries = typeEntries.filter(e =>
                e.status === UserArtifactStatus.FINISHED && e.endDate !== null
            );
            animeShort = {
                finishedCount: shortFinished.length,
                totalDuration: shortFinished.reduce((acc, e) => acc + (e.duration ?? 0), 0),
                bars: subPeriods.map(sp => ({
                    label: sp.label,
                    showLabel: sp.displayLabel ?? false,
                    value: finishedTypeEntries.filter(e => {
                        if (!isShort(e)) return false;
                        const ts = Date.parse(e.endDate!);
                        return ts >= sp.start && ts <= sp.end;
                    }).length
                }))
            };
            animeRegular = {
                finishedCount: regularFinished.length,
                totalDuration: regularFinished.reduce((acc, e) => acc + (e.duration ?? 0), 0),
                bars: subPeriods.map(sp => ({
                    label: sp.label,
                    showLabel: sp.displayLabel ?? false,
                    value: finishedTypeEntries.filter(e => {
                        if (isShort(e)) return false;
                        const ts = Date.parse(e.endDate!);
                        return ts >= sp.start && ts <= sp.end;
                    }).length
                }))
            };
        }

        return { type, finishedCount: finishedInPeriod.length, totalDuration, averageScore, statusCounts, bars, episodeCount, episodeBars, animeShort, animeRegular };
        });
    }

    $: earliestDate = data.entries
        .filter(e => e.startDate)
        .reduce((min, e) => {
            const ts = Date.parse(e.startDate!);
            return ts < min ? ts : min;
        }, Date.now());

    $: bounds     = getPeriodBounds(selectedPeriod, offset, earliestDate);
    $: subPeriods = getSubPeriods(selectedPeriod, bounds);
    $: stats      = computeStats(data.entries, bounds.start, bounds.end, subPeriods);
    $: totalFinished = stats.reduce((acc, s) => acc + s.finishedCount, 0);
    $: totalDuration = stats.reduce((acc, s) => acc + s.totalDuration, 0);
</script>

<div class="p-4 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 dark:text-white">My Statistics</h1>

    <!-- Period selector -->
    <div class="mb-4">
        <ButtonGroup>
            {#each (Object.keys(PERIOD_LABEL) as Period[]) as period (period)}
                <Button
                    color={selectedPeriod === period ? 'primary' : 'alternative'}
                    onclick={() => selectPeriod(period)}
                >
                    {PERIOD_LABEL[period]}
                </Button>
            {/each}
        </ButtonGroup>
    </div>

    <!-- Period navigator -->
    <div class="mb-6 flex items-center gap-3">
        <Button color="alternative" size="sm" pill onclick={() => offset -= 1}>
            <ChevronLeftOutline class="w-4 h-4" />
        </Button>
        <span class="w-44 text-center font-medium text-gray-800 dark:text-gray-200">{bounds.label}</span>
        <Button color="alternative" size="sm" pill disabled={!bounds.canGoForward} onclick={() => offset += 1}>
            <ChevronRightOutline class="w-4 h-4" />
        </Button>
    </div>

    <!-- Summary banner -->
    {#if totalFinished > 0}
        <div class="mb-6 p-4 rounded-lg bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700">
            <p class="text-primary-800 dark:text-primary-200">
                During <span class="font-bold">{bounds.label}</span> you completed
                <span class="font-bold">{totalFinished} item{totalFinished !== 1 ? 's' : ''}</span>
                for a total of
                <span class="font-bold">{TimeUtil.formatDuration(totalDuration)}</span>
            </p>
        </div>
    {:else}
        <div class="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p class="text-gray-600 dark:text-gray-400">No completed items recorded for <span class="font-medium">{bounds.label}</span>.</p>
        </div>
    {/if}

    <!-- Per-type cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each stats as stat (stat.type)}
            <Card class="p-5 w-full" size="xl">
                <h5 class="text-xl font-bold mb-4 dark:text-white">{ARTIFACT_LABELS[stat.type]}</h5>

                <div class="mb-4">
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                        Completed
                    </p>
                    <p class="text-3xl font-semibold dark:text-white">{stat.finishedCount}</p>
                    {#if stat.totalDuration > 0}
                        <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {TimeUtil.formatDuration(stat.totalDuration)}
                        </p>
                    {/if}
                </div>

                {#if stat.averageScore !== null}
                    <div class="mb-4">
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Avg score</p>
                        <p class="text-lg font-medium dark:text-white">{stat.averageScore.toFixed(1)} / 100</p>
                    </div>
                {/if}

                {#if stat.statusCounts.length > 0}
                    <div>
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">In collection (all time)</p>
                        <div class="flex flex-wrap gap-2">
                            {#each stat.statusCounts as { label, count, status } (status)}
                                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    {label}: {count}
                                </span>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <p class="text-sm text-gray-400 dark:text-gray-500 italic">Nothing in collection yet.</p>
                {/if}

                <!-- Bar chart for temporal breakdown -->
                <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {#if stat.type === ArtifactType.ANIME && stat.animeRegular && stat.animeShort}
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                            Series (&gt;2 episodes) completed {SUB_PERIOD_LABEL[selectedPeriod]}
                            <span class="ml-2 font-medium text-gray-700 dark:text-gray-300">{stat.animeRegular.finishedCount}</span>
                        </p>
                        <BarChart bars={stat.animeRegular.bars} color={TYPE_COLOR[stat.type]} />
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-4 mb-1">
                            Singles / OVAs (≤2 episodes) completed {SUB_PERIOD_LABEL[selectedPeriod]}
                            <span class="ml-2 font-medium text-gray-700 dark:text-gray-300">{stat.animeShort.finishedCount}</span>
                        </p>
                        <BarChart bars={stat.animeShort.bars} color={TYPE_COLOR[stat.type]} />
                    {:else}
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Completed {SUB_PERIOD_LABEL[selectedPeriod]}</p>
                        <BarChart bars={stat.bars} color={TYPE_COLOR[stat.type]} />
                    {/if}
                </div>

                <!-- Episode chart for anime / tvshow -->
                {#if stat.episodeCount !== null && stat.episodeBars !== null}
                    <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                            Episodes watched {SUB_PERIOD_LABEL[selectedPeriod]}
                        </p>
                        <div class="flex items-baseline gap-3 mb-2">
                            <span class="text-2xl font-semibold dark:text-white">{stat.episodeCount}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">this {selectedPeriod}</span>
                        </div>
                        <BarChart bars={stat.episodeBars} color={TYPE_COLOR[stat.type]} />
                    </div>
                {/if}
            </Card>
        {/each}
    </div>
</div>
