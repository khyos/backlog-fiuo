<script lang="ts">
    import {
        Alert,
        Badge,
        Button,
        Input,
        Label,
        Select,
        Spinner,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";
    import { SearchOutline } from "flowbite-svelte-icons";

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    interface ReconcileItem {
        id: number;
        title: string;
        originalTitle: string | null;
        universe: number;
        universeLabel: string;
        year: number | null;
        url: string;
        coverUrl: string | null;
        genres: string[];
        creators: string;
        communityRating: number | null;
        userRating: number | null;
        dateDone: string | null;
        isDone: boolean;
        isWished: boolean;
        scId: string;
        dbId: number | null;
        dbType: string | null;
        dbScore: number | null;
        dbEndDate: string | null;
    }

    interface ReconcileResult {
        username: string;
        displayName: string;
        extractedAt: string;
        totalInCollection: number;
        exportedCount: number;
        matchedCount: number;
        missingCount: number;
        items: ReconcileItem[];
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    let username: string = '';
    let universe: string = 'film';
    let mode: string = 'all';
    let status: 'idle' | 'loading' | 'done' | 'error' = 'idle';
    let errorMessage: string = '';
    let result: ReconcileResult | null = null;

    /** Filter for the table: all | matched | missing | desync */
    let tableFilter: 'all' | 'matched' | 'missing' | 'desync' = 'all';
    /** Search within results */
    let tableSearch: string = '';

    const universeOptions = [
        { value: 'film',   name: 'Films' },
        { value: 'game',   name: 'Games' },
        { value: 'tvshow', name: 'TV Shows / Anime' },
    ];

    const modeOptions = [
        { value: 'done',   name: 'Done' },
        { value: 'wished', name: 'Wished' },
        { value: 'all',    name: 'Done + Wished' },
    ];

    // -------------------------------------------------------------------------
    // Create-page URL helpers
    // -------------------------------------------------------------------------

    /**
     * Returns the URL of the create page pre-filled with the SC id for items not yet in the DB.
     * When the universe is tvshow (series on SC), the user can choose movie/tvshow/anime.
     */
    function createUrl(item: ReconcileItem, type: 'movie' | 'game' | 'tvshow' | 'anime'): string {
        return `/${type}/create?scId=${encodeURIComponent(item.scId)}&title=${encodeURIComponent(item.title)}`;
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /** Returns YYYY-MM-DD in local timezone for date comparison */
    function toLocalDateString(dateStr: string | null): string | null {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function artifactUrl(item: ReconcileItem): string {
        return `/${item.dbType}/${item.dbId}`;
    }

    // -------------------------------------------------------------------------
    // Derived list
    // -------------------------------------------------------------------------

    $: filteredItems = (result?.items ?? []).filter((item) => {
        if (tableFilter === 'matched' && item.dbId === null) return false;
        if (tableFilter === 'missing' && item.dbId !== null) return false;
        if (tableFilter === 'desync' && !isDesynced(item)) return false;
        if (tableSearch.trim()) {
            const q = tableSearch.toLowerCase();
            return item.title.toLowerCase().includes(q) || (item.originalTitle ?? '').toLowerCase().includes(q);
        }
        return true;
    });

    // -------------------------------------------------------------------------
    // Fetch
    // -------------------------------------------------------------------------

    async function reconcile(): Promise<void> {
        if (!username.trim()) return;
        status = 'loading';
        errorMessage = '';
        result = null;
        tableFilter = 'all';
        tableSearch = '';

        try {
            const params = new URLSearchParams({
                username: username.trim(),
                universe,
                mode,
            });
            const response = await fetch(`/api/senscritique/reconcile?${params}`);
            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || `HTTP ${response.status}`);
            }
            result = await response.json();
            status = 'done';
        } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e);
            status = 'error';
        }
    }

    function handleKeyUp(event: KeyboardEvent): void {
        if (event.key === 'Enter' && username.trim()) reconcile();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Tracks update state per item id: 'idle' | 'loading' | 'done' | 'error' */
    let dateUpdateState: Record<number, 'idle' | 'loading' | 'done' | 'error'> = {};
    let scoreUpdateState: Record<number, 'idle' | 'loading' | 'done' | 'error'> = {};

    async function syncDate(item: ReconcileItem): Promise<void> {
        if (!item.dbId || !item.dateDone) return;
        dateUpdateState = { ...dateUpdateState, [item.id]: 'loading' };
        try {
            const startEnd = item.universe === 1 ? 'both' : 'end';
            const res = await fetch(`/api/artifact/${item.dbId}/userDate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: item.dateDone, startEnd }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // Update local state so the DB Date cell refreshes
            if (result) {
                result = {
                    ...result,
                    items: result.items.map((i) =>
                        i.id === item.id ? { ...i, dbEndDate: item.dateDone } : i
                    ),
                };
            }
            dateUpdateState = { ...dateUpdateState, [item.id]: 'done' };
        } catch {
            dateUpdateState = { ...dateUpdateState, [item.id]: 'error' };
        }
    }

    async function syncScore(item: ReconcileItem): Promise<void> {
        if (!item.dbId || item.userRating === null) return;
        scoreUpdateState = { ...scoreUpdateState, [item.id]: 'loading' };
        const score = item.userRating * 10;
        try {
            const res = await fetch(`/api/artifact/${item.dbId}/userScore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (result) {
                result = {
                    ...result,
                    items: result.items.map((i) =>
                        i.id === item.id ? { ...i, dbScore: score } : i
                    ),
                };
            }
            scoreUpdateState = { ...scoreUpdateState, [item.id]: 'done' };
        } catch {
            scoreUpdateState = { ...scoreUpdateState, [item.id]: 'error' };
        }
    }

    function isDesynced(item: ReconcileItem): boolean {
        if (item.dbId === null) return false;
        const scoreDesynced = item.userRating !== null && item.dbScore !== item.userRating * 10;
        const scDate = toLocalDateString(item.dateDone);
        const dbDate = toLocalDateString(item.dbEndDate);
        const dateDesynced = item.dateDone !== null && scDate !== dbDate;
        return scoreDesynced || dateDesynced;
    }

    function scUniverseForItem(item: ReconcileItem): 'movie' | 'game' | 'tvshow' | 'serie' {
        // SC universe numbers: 1=Films, 3=Jeux vidéo, 4=Séries
        if (item.universe === 1) return 'movie';
        if (item.universe === 3) return 'game';
        return 'serie'; // 4 = Séries (tvshow or anime)
    }
</script>

<div class="max-w-7xl mx-auto p-4">
    <h2 class="text-4xl font-extrabold dark:text-white mb-2">SensCritique Import</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
        Fetch a user's SensCritique collection and reconcile it with the local database.
        Items already in the database are linked; missing items offer a quick path to create them.
    </p>

    <!-- Search form -->
    <div class="flex flex-wrap gap-4 mb-6 items-end">
        <div class="flex-1 min-w-48">
            <Label for="sc-username" class="mb-1">SensCritique username</Label>
            <Input
                id="sc-username"
                placeholder="e.g. johndoe"
                autocomplete="off"
                bind:value={username}
                onkeyup={handleKeyUp}>
                {#snippet right()}
                    <SearchOutline />
                {/snippet}
            </Input>
        </div>

        <div class="min-w-36">
            <Label for="sc-universe" class="mb-1">Universe</Label>
            <Select id="sc-universe" items={universeOptions} bind:value={universe} />
        </div>

        <div class="min-w-36">
            <Label for="sc-mode" class="mb-1">Mode</Label>
            <Select id="sc-mode" items={modeOptions} bind:value={mode} />
        </div>

        <Button onclick={reconcile} disabled={status === 'loading' || !username.trim()}>
            {#if status === 'loading'}
                <Spinner size="4" class="mr-2" />Fetching…
            {:else}
                Reconcile
            {/if}
        </Button>
    </div>

    <!-- Error -->
    {#if status === 'error'}
        <Alert color="red" class="mb-4" dismissable>
            {errorMessage}
        </Alert>
    {/if}

    <!-- Results summary -->
    {#if result}
        <div class="flex flex-wrap gap-3 mb-4 items-center">
            <span class="text-lg font-semibold dark:text-white">
                {result.displayName}
            </span>
            <Badge color="gray">{result.exportedCount} exported</Badge>
            <Badge color="green">{result.matchedCount} in DB</Badge>
            <Badge color="red">{result.missingCount} missing</Badge>
        </div>

        <!-- Filter bar -->
        <div class="flex flex-wrap gap-3 mb-4 items-center">
            <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {#each [['all', 'All'], ['matched', 'In DB'], ['desync', 'Desync'], ['missing', 'Missing']] as [val, label] (val)}
                    <button
                        class="px-3 py-1 text-sm font-medium transition-colors
                            {tableFilter === val
                                ? 'bg-primary-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
                        onclick={() => (tableFilter = val as 'all' | 'matched' | 'missing' | 'desync')}
                    >{label}</button>
                {/each}
            </div>
            <div class="flex-1 min-w-48 max-w-xs">
                <Input placeholder="Search by title…" bind:value={tableSearch} size="sm" />
            </div>
            <span class="text-sm text-gray-500 dark:text-gray-400">{filteredItems.length} shown</span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <Table hoverable={true}>
                <TableHead>
                    <TableHeadCell>Cover</TableHeadCell>
                    <TableHeadCell class="max-w-48">Title</TableHeadCell>
                    <TableHeadCell>Year</TableHeadCell>
                    <TableHeadCell>Universe</TableHeadCell>
                    <TableHeadCell>Your SC Rating</TableHeadCell>
                    <TableHeadCell>SC Date</TableHeadCell>
                    <TableHeadCell>Your DB Rating</TableHeadCell>
                    <TableHeadCell>DB Date</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                </TableHead>
                <TableBody>
                    {#each filteredItems as item (item.id)}
                        <TableBodyRow>
                            <!-- Cover -->
                            <TableBodyCell>
                                {#if item.coverUrl}
                                    <img
                                        src={item.coverUrl}
                                        alt={item.title}
                                        class="w-10 h-14 object-cover rounded"
                                        loading="lazy"
                                    />
                                {:else}
                                    <div class="w-10 h-14 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                                        N/A
                                    </div>
                                {/if}
                            </TableBodyCell>

                            <!-- Title -->
                            <TableBodyCell class="max-w-48">
                                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                <a href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="font-medium text-blue-600 hover:underline dark:text-blue-400 block truncate"
                                >
                                    {item.title}
                                </a>
                                {#if item.originalTitle && item.originalTitle !== item.title}
                                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{item.originalTitle}</div>
                                {/if}
                                {#if item.creators}
                                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{item.creators}</div>
                                {/if}
                            </TableBodyCell>

                            <!-- Year -->
                            <TableBodyCell>{item.year ?? '—'}</TableBodyCell>

                            <!-- Universe -->
                            <TableBodyCell>
                                <span class="text-xs">{item.universeLabel}</span>
                            </TableBodyCell>

                            <!-- User SC rating -->
                            <TableBodyCell>
                                {#if item.userRating !== null}
                                    <span class="font-medium">{item.userRating}</span>
                                    <span class="text-xs text-gray-400">/10</span>
                                {:else}
                                    —
                                {/if}
                            </TableBodyCell>

                            <!-- SC date done -->
                            <TableBodyCell>
                                <span class="text-xs">{formatDate(item.dateDone)}</span>
                            </TableBodyCell>

                            <!-- DB user score -->
                            <TableBodyCell>
                                {#if item.dbScore !== null}
                                    <span class="font-medium">{item.dbScore}</span>
                                    <span class="text-xs text-gray-400">/100</span>
                                {:else}
                                    —
                                {/if}
                            </TableBodyCell>

                            <!-- DB end date -->
                            <TableBodyCell>
                                <span class="text-xs">{formatDate(item.dbEndDate)}</span>
                            </TableBodyCell>

                            <!-- Status -->
                            <TableBodyCell>
                                {#if item.dbId !== null}
                                    {#if isDesynced(item)}
                                        <Badge color="yellow">Desync</Badge>
                                    {:else}
                                        <Badge color="green">In DB</Badge>
                                    {/if}
                                {:else}
                                    <Badge color="red">Missing</Badge>
                                {/if}
                            </TableBodyCell>

                            <!-- Actions -->
                            <TableBodyCell>
                                {#if item.dbId !== null}
                                    <div class="flex flex-wrap gap-1 items-center">
                                        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                        <Button size="xs" color="blue" href={artifactUrl(item)}>View →</Button>
                                        {#if item.dateDone}
                                            {@const state = dateUpdateState[item.id] ?? 'idle'}
                                            <Button
                                                size="xs"
                                                color={state === 'done' ? 'green' : state === 'error' ? 'red' : 'light'}
                                                disabled={state === 'loading'}
                                                onclick={() => syncDate(item)}
                                            >
                                                {#if state === 'loading'}
                                                    <Spinner size="4" class="mr-1" />Syncing…
                                                {:else if state === 'done'}
                                                    ✓ Synced
                                                {:else if state === 'error'}
                                                    ✗ Error
                                                {:else}
                                                    Sync Date
                                                {/if}
                                            </Button>
                                        {/if}
                                        {#if item.userRating !== null}
                                            {@const state = scoreUpdateState[item.id] ?? 'idle'}
                                            <Button
                                                size="xs"
                                                color={state === 'done' ? 'green' : state === 'error' ? 'red' : 'light'}
                                                disabled={state === 'loading'}
                                                onclick={() => syncScore(item)}
                                            >
                                                {#if state === 'loading'}
                                                    <Spinner size="4" class="mr-1" />Syncing…
                                                {:else if state === 'done'}
                                                    ✓ Synced
                                                {:else if state === 'error'}
                                                    ✗ Error
                                                {:else}
                                                    Sync Score
                                                {/if}
                                            </Button>
                                        {/if}
                                    </div>
                                {:else}
                                    {@const scUniverse = scUniverseForItem(item)}
                                    <div class="flex flex-wrap gap-1">
                                        {#if scUniverse === 'movie'}
                                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                            <Button size="xs" color="blue" href={createUrl(item, 'movie')} target="_blank" rel="noopener noreferrer">Create Movie</Button>
                                        {:else if scUniverse === 'game'}
                                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                            <Button size="xs" color="blue" href={createUrl(item, 'game')} target="_blank" rel="noopener noreferrer">Create Game</Button>
                                        {:else}
                                            <!-- serie — could be TV show or anime -->
                                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                            <Button size="xs" color="blue" href={createUrl(item, 'tvshow')} target="_blank" rel="noopener noreferrer">Create TV Show</Button>
                                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                            <Button size="xs" color="blue" href={createUrl(item, 'anime')} target="_blank" rel="noopener noreferrer">Create Anime</Button>
                                        {/if}
                                    </div>
                                {/if}
                            </TableBodyCell>
                        </TableBodyRow>
                    {/each}

                    {#if filteredItems.length === 0}
                        <TableBodyRow>
                            <TableBodyCell colspan={10} class="text-center text-gray-500 dark:text-gray-400 py-8">
                                No items match the current filter.
                            </TableBodyCell>
                        </TableBodyRow>
                    {/if}
                </TableBody>
            </Table>
        </div>
    {/if}
</div>
