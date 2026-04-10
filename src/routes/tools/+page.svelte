<script lang="ts">
    import { Card } from "flowbite-svelte";
    import {
        ExclamationCircleSolid,
        UserCircleSolid,
        DownloadSolid,
        CalendarMonthSolid,
    } from "flowbite-svelte-icons";
</script>

<svelte:head>
    <title>Backlog - Tools</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Tools</h1>
        <p class="mt-2 text-gray-500 dark:text-gray-400">Maintenance and import utilities</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <!-- Data Anomalies -->
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="/dataanomalies" class="group no-underline">
            <Card class="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                <div class="flex items-center gap-4 pl-2">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <ExclamationCircleSolid class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Data Anomalies</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Detect and review inconsistencies in the catalog data.</p>
                    </div>
                </div>
            </Card>
        </a>

        <!-- User Anomalies -->
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="/useranomalies" class="group no-underline">
            <Card class="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                <div class="flex items-center gap-4 pl-2">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <UserCircleSolid class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">User Anomalies</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Review inconsistencies in user entries and statuses.</p>
                    </div>
                </div>
            </Card>
        </a>

        <!-- SC Import -->
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="/senscritique/import" class="group no-underline">
            <Card class="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                <div class="flex items-center gap-4 pl-2">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <DownloadSolid class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">SensCritique Import</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Import your SensCritique collection into your backlog.</p>
                    </div>
                </div>
            </Card>
        </a>

        <!-- MAL Import -->
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="/mal/import" class="group no-underline">
            <Card class="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                <div class="flex items-center gap-4 pl-2">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <DownloadSolid class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">MAL Import</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Import your MyAnimeList collection into your backlog.</p>
                    </div>
                </div>
            </Card>
        </a>

        <!-- Anime Episode Dates -->
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="/tools/anime-episode-dates" class="group no-underline">
            <Card class="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer">
                <div class="flex items-center gap-4 pl-2">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-md shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <CalendarMonthSolid class="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Anime Episode Dates</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Set end dates for finished anime episodes by distributing them between two dates.</p>
                    </div>
                </div>
            </Card>
        </a>
    </div>
</div>
