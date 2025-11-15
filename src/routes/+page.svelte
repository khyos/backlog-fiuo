<script lang="ts">
    import { Button, Card } from "flowbite-svelte";
    import { 
        ClockSolid, 
        RocketSolid, 
        ForwardSolid, 
        PlusOutline,
        EyeSolid,
        ClapperboardPlaySolid,
        ImageSolid,
        StarSolid,
        BookmarkSolid,
        ChevronRightOutline
    } from "flowbite-svelte-icons";
    import { ArtifactType } from "$lib/model/Artifact";
    import type { PageData } from "./$types";

    export let data: PageData;

    // Calculate some quick stats
    $: recentBacklogs = data.backlogs.slice(0, 6);
</script>

<svelte:head>
    <title>Backlog - Your Entertainment Hub</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
    <!-- Hero Section -->
    <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-400/10 dark:to-purple-400/10"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="text-center">
                <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                    Welcome to Your
                    <span class="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                        Backlog
                    </span>
                </h1>
            </div>
        </div>
    </div>

    <!-- Stats Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <!-- Section Title -->
        <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Quick Access
            </h2>
            <div class="h-1 w-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto mt-6"></div>
        </div>

        <!-- Enhanced Quick Access Grid -->
        <div class="flex justify-center mb-20">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-3xl">
                <!-- Current Backlogs Section -->
                <Card class="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-purple-900/20 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1 h-fit">
                    <!-- Animated background overlay -->
                    <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div class="relative z-10 p-8">
                        <div class="text-center mb-8">
                            <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <ClockSolid class="w-8 h-8 text-white" />
                            </div>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Current Backlogs</h2>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">What you're actively enjoying right now</p>
                            <div class="h-1 w-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/current/{ArtifactType.GAME}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <RocketSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Games</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/current/{ArtifactType.MOVIE}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <ClapperboardPlaySolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Movies</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/current/{ArtifactType.TVSHOW}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <ImageSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">TV Shows</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/current/{ArtifactType.ANIME}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <StarSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Anime</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </Card>

                <!-- Coming Soon Section -->
                <Card class="group relative overflow-hidden bg-gradient-to-br from-indigo-50 via-cyan-50 to-teal-50 dark:from-indigo-900/20 dark:via-cyan-900/20 dark:to-teal-900/20 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1 h-fit">
                    <!-- Animated background overlay -->
                    <div class="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-cyan-400/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div class="relative z-10 p-8">
                        <div class="text-center mb-8">
                            <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-cyan-500 shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                <ForwardSolid class="w-8 h-8 text-white" />
                            </div>
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Coming Soon</h2>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Upcoming releases to look forward to</p>
                            <div class="h-1 w-16 bg-gradient-to-r from-indigo-400 to-cyan-500 rounded-full mx-auto"></div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/future/{ArtifactType.GAME}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <RocketSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Games</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/future/{ArtifactType.MOVIE}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <ClapperboardPlaySolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Movies</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/future/{ArtifactType.TVSHOW}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <ImageSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">TV Shows</span>
                                </div>
                            </a>
                            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                            <a href="/backlog/future/{ArtifactType.ANIME}" class="group/btn relative overflow-hidden">
                                <div class="relative h-24 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                                    <div class="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                    <StarSolid class="w-6 h-6 text-white relative z-10 group-hover/btn:scale-110 transition-transform duration-300" />
                                    <span class="text-sm font-semibold text-white relative z-10">Anime</span>
                                </div>
                            </a>
                        </div>
                    </div>
                </Card>
            </div>
        </div>

        <!-- Recent Backlogs Section -->
        {#if recentBacklogs.length > 0}
            <div class="w-full">
                <!-- Section Header -->
                <div class="text-center mb-12">
                    <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg mx-auto mb-4">
                        <BookmarkSolid class="w-8 h-8 text-white" />
                    </div>
                    <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Recent Backlogs
                    </h2>
                    <div class="h-1 w-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto"></div>
                </div>

                <!-- Enhanced Backlogs Grid -->
                <div class="flex justify-center">
                    <Card class="group relative overflow-hidden bg-gradient-to-br from-purple-50/80 via-pink-50/80 to-rose-50/80 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 backdrop-blur-sm w-full max-w-5xl">
                        <!-- Animated background overlay -->
                        <div class="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        
                        <div class="relative z-10 p-8">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {#each recentBacklogs as backlog, index (backlog.id)}
                                    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                    <a href="/backlog/{backlog.id}" class="group/item relative overflow-hidden block">
                                        <div class="relative p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 h-full">
                                            <!-- Animated background on hover -->
                                            <div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                                            
                                            <div class="relative z-10 flex flex-col h-full">
                                                <div class="flex items-center space-x-4 mb-4">
                                                    <!-- Index number with gradient -->
                                                    <div class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg group-hover/item:scale-110 transition-transform duration-300 flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    
                                                    <!-- Backlog info -->
                                                    <div class="flex-grow min-w-0">
                                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover/item:text-purple-700 dark:group-hover/item:text-purple-300 transition-colors duration-300 line-clamp-2">
                                                            {backlog.title}
                                                        </h3>
                                                        <p class="text-sm text-gray-600 dark:text-gray-400">
                                                            Recently updated
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <!-- Action section -->
                                                <div class="flex items-center justify-end mt-auto pt-2">
                                                    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 text-purple-600 dark:text-purple-300 group-hover/item:scale-110 group-hover/item:bg-gradient-to-br group-hover/item:from-purple-200 group-hover/item:to-pink-200 dark:group-hover/item:from-purple-800 dark:group-hover/item:to-pink-800 transition-all duration-300">
                                                        <ChevronRightOutline class="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                {/each}
                            </div>
                            
                            <!-- View All Button -->
                            <div class="text-center mt-8">
                                <Button 
                                    href="/backlog" 
                                    size="lg" 
                                    class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <EyeSolid class="w-5 h-5 mr-2" />
                                    View All Backlogs
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        {:else}
            <!-- Empty State for Recent Backlogs -->
            <div class="flex justify-center">
                <div class="w-full max-w-2xl">
                    <Card class="bg-gradient-to-br from-gray-50/80 to-slate-100/80 dark:from-gray-800/50 dark:to-slate-800/50 border-0 shadow-lg backdrop-blur-sm">
                        <div class="text-center p-12">
                            <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-400 to-slate-500 shadow-lg mx-auto mb-6">
                                <BookmarkSolid class="w-8 h-8 text-white" />
                            </div>
                            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                No Recent Backlogs
                            </h3>
                            <p class="text-gray-600 dark:text-gray-300 mb-6">
                                Start creating your first backlog to track your entertainment!
                            </p>
                            {#if data.permissions.canCreate}
                                <Button 
                                    href="/backlog/create" 
                                    class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    <PlusOutline class="w-4 h-4 mr-2" />
                                    Create Your First Backlog
                                </Button>
                            {/if}
                        </div>
                    </Card>
                </div>
            </div>
        {/if}
    </div>
</div>