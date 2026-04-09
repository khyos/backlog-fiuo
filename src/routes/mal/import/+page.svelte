<script lang="ts">
    import {
        Alert,
        Badge,
        Button,
        Input,
        Label,
        Spinner,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from "flowbite-svelte";

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    interface MALReconcileItem {
        malId: string;
        title: string;
        malUrl: string;
        malScore: number | null;
        malStatus: string;
        finishDate: string | null;
        startDate: string | null;
        dbId: number | null;
        dbType: string | null;
        dbScore: number | null;
        dbEndDate: string | null;
        dbStartDate: string | null;
    }

    interface MALReconcileResult {
        username: string;
        fetchedAt: string;
        totalFetched: number;
        matchedCount: number;
        missingCount: number;
        items: MALReconcileItem[];
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    let fileInput: HTMLInputElement | null = null;
    let selectedFileName: string = '';
    let fetchStatus: 'idle' | 'loading' | 'done' | 'error' = 'idle';
    let errorMessage: string = '';
    let result: MALReconcileResult | null = null;

    /** Filter for the table: all | matched | missing | desync */
    let tableFilter: 'all' | 'matched' | 'missing' | 'desync' = 'all';
    /** Search within results */
    let tableSearch: string = '';

    const MAL_STATUS_LABELS: Record<string, string> = {
        'Completed':      'Completed',
        'Watching':       'Watching',
        'Plan to Watch':  'Plan to Watch',
        'On-Hold':        'On Hold',
        'Dropped':        'Dropped',
    };

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

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

    function artifactUrl(item: MALReconcileItem): string {
        return `/${item.dbType}/${item.dbId}`;
    }

    function createUrl(item: MALReconcileItem): string {
        return `/anime/create?malId=${encodeURIComponent(item.malId)}&title=${encodeURIComponent(item.title)}`;
    }

    function isDesynced(item: MALReconcileItem): boolean {
        if (item.dbId === null) return false;
        const scoreDesynced = item.malScore !== null && item.dbScore !== item.malScore * 10;
        const malFinish = item.finishDate;
        const dbFinish = toLocalDateString(item.dbEndDate);
        const endDateDesynced = item.finishDate !== null && malFinish !== dbFinish;
        const malStart = item.startDate;
        const dbStart = toLocalDateString(item.dbStartDate);
        const startDateDesynced = item.startDate !== null && malStart !== dbStart;
        return scoreDesynced || endDateDesynced || startDateDesynced;
    }

    function onFileChange(event: Event): void {
        const input = event.currentTarget as HTMLInputElement;
        selectedFileName = input.files?.[0]?.name ?? '';
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
            return item.title.toLowerCase().includes(q);
        }
        return true;
    });

    // -------------------------------------------------------------------------
    // Reconcile
    // -------------------------------------------------------------------------

    async function reconcile(): Promise<void> {
        const file = fileInput?.files?.[0];
        if (!file) return;
        fetchStatus = 'loading';
        errorMessage = '';
        result = null;
        tableFilter = 'all';
        tableSearch = '';

        try {
            const xmlContent = await file.text();
            const response = await fetch('/api/mal/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmlContent }),
            });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(body || `HTTP ${response.status}`);
            }
            result = await response.json();
            fetchStatus = 'done';
        } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e);
            fetchStatus = 'error';
        }
    }

    // -------------------------------------------------------------------------
    // Sync actions
    // -------------------------------------------------------------------------

    let dateUpdateState: Record<string, 'idle' | 'loading' | 'done' | 'error'> = {};
    let startDateUpdateState: Record<string, 'idle' | 'loading' | 'done' | 'error'> = {};
    let scoreUpdateState: Record<string, 'idle' | 'loading' | 'done' | 'error'> = {};

    async function syncDate(item: MALReconcileItem): Promise<void> {
        if (!item.dbId || !item.finishDate) return;
        dateUpdateState = { ...dateUpdateState, [item.malId]: 'loading' };
        try {
            const res = await fetch(`/api/artifact/${item.dbId}/userDate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: item.finishDate, startEnd: 'end' }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (result) {
                result = {
                    ...result,
                    items: result.items.map((i) =>
                        i.malId === item.malId ? { ...i, dbEndDate: item.finishDate } : i
                    ),
                };
            }
            dateUpdateState = { ...dateUpdateState, [item.malId]: 'done' };
        } catch {
            dateUpdateState = { ...dateUpdateState, [item.malId]: 'error' };
        }
    }

    async function syncStartDate(item: MALReconcileItem): Promise<void> {
        if (!item.dbId || !item.startDate) return;
        startDateUpdateState = { ...startDateUpdateState, [item.malId]: 'loading' };
        try {
            const res = await fetch(`/api/artifact/${item.dbId}/userDate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: item.startDate, startEnd: 'start' }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            if (result) {
                result = {
                    ...result,
                    items: result.items.map((i) =>
                        i.malId === item.malId ? { ...i, dbStartDate: item.startDate } : i
                    ),
                };
            }
            startDateUpdateState = { ...startDateUpdateState, [item.malId]: 'done' };
        } catch {
            startDateUpdateState = { ...startDateUpdateState, [item.malId]: 'error' };
        }
    }

    async function syncScore(item: MALReconcileItem): Promise<void> {
        if (!item.dbId || item.malScore === null) return;
        scoreUpdateState = { ...scoreUpdateState, [item.malId]: 'loading' };
        const score = item.malScore * 10;
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
                        i.malId === item.malId ? { ...i, dbScore: score } : i
                    ),
                };
            }
            scoreUpdateState = { ...scoreUpdateState, [item.malId]: 'done' };
        } catch {
            scoreUpdateState = { ...scoreUpdateState, [item.malId]: 'error' };
        }
    }
</script>

<div class="max-w-8xl mx-auto p-4">
    <h2 class="text-4xl font-extrabold dark:text-white mb-2">MyAnimeList Import</h2>
    <p class="text-gray-500 dark:text-gray-400 mb-4">
        Reconcile your MAL anime list with the local database.
        Items already in the database are linked; missing items offer a quick path to create them.
    </p>

    <!-- Instructions -->
    <div class="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
        <strong>How to export your MAL list:</strong>
        <ol class="list-decimal ml-5 mt-1 space-y-1">
            <li>Go to <a href="https://myanimelist.net/panel.php?go=export" target="_blank" rel="noopener noreferrer" class="underline">myanimelist.net/panel.php?go=export</a></li>
            <li>Click <em>Export Anime List</em> and download the <code>.xml.gz</code> file</li>
            <li>Extract the <code>.xml</code> file from the archive</li>
            <li>Upload it below</li>
        </ol>
    </div>

    <!-- Upload form -->
    <div class="flex flex-wrap gap-4 mb-6 items-end">
        <div class="flex-1 min-w-64">
            <Label for="mal-file" class="mb-1">MAL XML export file</Label>
            <input
                id="mal-file"
                type="file"
                accept=".xml"
                bind:this={fileInput}
                onchange={onFileChange}
                class="block w-full text-sm text-gray-900 dark:text-gray-100
                       file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                       file:text-sm file:font-medium
                       file:bg-primary-600 file:text-white hover:file:bg-primary-700
                       cursor-pointer"
            />
        </div>

        <Button
            onclick={reconcile}
            disabled={fetchStatus === 'loading' || !selectedFileName}>
            {#if fetchStatus === 'loading'}
                <Spinner size="4" class="mr-2" />Processing…
            {:else}
                Reconcile
            {/if}
        </Button>
    </div>

    <!-- Error -->
    {#if fetchStatus === 'error'}
        <Alert color="red" class="mb-4" dismissable>
            {errorMessage}
        </Alert>
    {/if}

    <!-- Results summary -->
    {#if result}
        <div class="flex flex-wrap gap-3 mb-4 items-center">
            <span class="text-lg font-semibold dark:text-white">
                {result.username}
            </span>
            <Badge color="gray">{result.totalFetched} fetched</Badge>
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
                    <TableHeadCell class="max-w-48">Title</TableHeadCell>
                    <TableHeadCell>MAL Status</TableHeadCell>
                    <TableHeadCell>Your MAL Rating</TableHeadCell>
                    <TableHeadCell>MAL Start Date</TableHeadCell>
                    <TableHeadCell>MAL Finish Date</TableHeadCell>
                    <TableHeadCell>Your DB Rating</TableHeadCell>
                    <TableHeadCell>DB Start Date</TableHeadCell>
                    <TableHeadCell>DB End Date</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                </TableHead>
                <TableBody>
                    {#each filteredItems as item (item.malId)}
                        <TableBodyRow>
                            <!-- Title -->
                            <TableBodyCell class="max-w-48">
                                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                <a href={item.malUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="font-medium text-blue-600 hover:underline dark:text-blue-400 block truncate"
                                >
                                    {item.title}
                                </a>
                            </TableBodyCell>

                            <!-- MAL status -->
                            <TableBodyCell>
                                <span class="text-xs">{MAL_STATUS_LABELS[item.malStatus] ?? item.malStatus}</span>
                            </TableBodyCell>

                            <!-- User MAL rating -->
                            <TableBodyCell>
                                {#if item.malScore !== null}
                                    <span class="font-medium">{item.malScore}</span>
                                    <span class="text-xs text-gray-400">/10</span>
                                {:else}
                                    —
                                {/if}
                            </TableBodyCell>

                            <!-- MAL start date -->
                            <TableBodyCell>
                                <span class="text-xs">{formatDate(item.startDate)}</span>
                            </TableBodyCell>

                            <!-- MAL finish date -->
                            <TableBodyCell>
                                <span class="text-xs">{formatDate(item.finishDate)}</span>
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

                            <!-- DB start date -->
                            <TableBodyCell>
                                <span class="text-xs">{formatDate(item.dbStartDate)}</span>
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
                                        {#if item.finishDate && item.finishDate !== toLocalDateString(item.dbEndDate)}
                                            {@const state = dateUpdateState[item.malId] ?? 'idle'}
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
                                                    Sync End Date
                                                {/if}
                                            </Button>
                                        {/if}
                                        {#if item.startDate && item.startDate !== toLocalDateString(item.dbStartDate)}
                                            {@const state = startDateUpdateState[item.malId] ?? 'idle'}
                                            <Button
                                                size="xs"
                                                color={state === 'done' ? 'green' : state === 'error' ? 'red' : 'light'}
                                                disabled={state === 'loading'}
                                                onclick={() => syncStartDate(item)}
                                            >
                                                {#if state === 'loading'}
                                                    <Spinner size="4" class="mr-1" />Syncing…
                                                {:else if state === 'done'}
                                                    ✓ Synced
                                                {:else if state === 'error'}
                                                    ✗ Error
                                                {:else}
                                                    Sync Start Date
                                                {/if}
                                            </Button>
                                        {/if}
                                        {#if item.malScore !== null && item.dbScore !== item.malScore * 10}
                                            {@const state = scoreUpdateState[item.malId] ?? 'idle'}
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
                                    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                    <Button size="xs" color="blue" href={createUrl(item)} target="_blank" rel="noopener noreferrer">
                                        Create Anime
                                    </Button>
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
