<script lang="ts">
    export let data;

    // User comes from parent layout
    import { page } from '$app/stores';
    $: user = $page.data.user;

    let activeTab: 'consensus' | 'draftkings' = 'consensus';

    // Filter states
    let searchQuery = '';

    // Expandable game state
    let expandedGames = new Set<string>();

    /**
     * Normalize player names for fuzzy matching
     */
    function normalizePlayerName(name: string): string {
        return name
            .toLowerCase()
            .replace(/['\-\.]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Toggle game expansion
     */
    function toggleGame(gameId: string) {
        if (expandedGames.has(gameId)) {
            expandedGames.delete(gameId);
        } else {
            expandedGames.add(gameId);
        }
        expandedGames = expandedGames;
    }

    /**
     * Expand all games
     */
    function expandAll() {
        if (activeTab === 'consensus') {
            expandedGames = new Set(groupedOddsApiProps.map(g => g.gameId));
        } else {
            expandedGames = new Set(groupedDKProps.map(g => g.gameId));
        }
    }

    /**
     * Collapse all games
     */
    function collapseAll() {
        expandedGames = new Set();
    }

    // Filtered Odds API props with fuzzy name matching
    $: filteredOddsApiProps = data.oddsApiProps.filter((prop: any) => {
        if (searchQuery) {
            const normalizedSearch = normalizePlayerName(searchQuery);
            const normalizedPlayer = normalizePlayerName(prop.playerName);
            if (!normalizedPlayer.includes(normalizedSearch)) {
                return false;
            }
        }
        return true;
    });

    // Filtered DK props with fuzzy name matching
    $: filteredDKProps = data.dkProps.filter((playerGroup: any) => {
        if (searchQuery) {
            const normalizedSearch = normalizePlayerName(searchQuery);
            const normalizedPlayer = normalizePlayerName(playerGroup.playerName);
            if (!normalizedPlayer.includes(normalizedSearch)) {
                return false;
            }
        }
        return true;
    });

    // Group Odds API props by game
    $: groupedOddsApiProps = (() => {
        const grouped = new Map();

        for (const prop of filteredOddsApiProps) {
            const gameId = prop.game.id;
            if (!grouped.has(gameId)) {
                grouped.set(gameId, {
                    gameId: gameId,
                    awayTeam: prop.game.awayTeam,
                    homeTeam: prop.game.homeTeam,
                    commenceTime: prop.game.commenceTime,
                    props: []
                });
            }
            grouped.get(gameId).props.push(prop);
        }

        return Array.from(grouped.values()).sort((a, b) =>
            new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
        );
    })();

    // Group DK props by game
    $: groupedDKProps = (() => {
        const grouped = new Map();

        for (const playerGroup of filteredDKProps) {
            const gameId = playerGroup.game.id;
            if (!grouped.has(gameId)) {
                grouped.set(gameId, {
                    gameId: gameId,
                    awayTeam: playerGroup.game.awayTeam,
                    homeTeam: playerGroup.game.homeTeam,
                    commenceTime: playerGroup.game.commenceTime,
                    playerGroups: []
                });
            }
            grouped.get(gameId).playerGroups.push(playerGroup);
        }

        return Array.from(grouped.values()).sort((a, b) =>
            new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime()
        );
    })();

    function formatOdds(odds: number | null | undefined): string {
        if (odds === null || odds === undefined) {
            return 'N/A';
        }
        if (odds > 0) {
            return `+${odds}`;
        }
        return odds.toString();
    }

    function formatPropType(propType: string): string {
        return propType
            .replace('player_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-4xl font-bold text-slate-100 mb-2">NFL Player Props</h1>
        <p class="text-slate-400 text-lg">Compare odds and explore alternate lines</p>
    </div>

    <!-- Search Bar + Controls -->
    <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 mb-6">
        <div class="flex gap-3">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search player name..."
                class="flex-1 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
            />
            <button
                on:click={expandAll}
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-colors"
            >
                Expand All
            </button>
            <button
                on:click={collapseAll}
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-colors"
            >
                Collapse All
            </button>
        </div>
    </div>

    <!-- Tabs -->
    <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 mb-6">
        <div class="flex border-b border-slate-700">
            <button
                on:click={() => activeTab = 'consensus'}
                class="flex-1 px-6 py-4 text-center font-semibold transition-all {activeTab === 'consensus'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'}"
            >
                <div class="text-lg">Market Consensus</div>
                <div class="text-xs mt-1 opacity-75">
                    Compare 6+ sportsbooks • {groupedOddsApiProps.length} games
                </div>
            </button>
            <button
                on:click={() => activeTab = 'draftkings'}
                class="flex-1 px-6 py-4 text-center font-semibold transition-all {activeTab === 'draftkings'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'}"
            >
                <div class="text-lg">DraftKings Alt Lines</div>
                <div class="text-xs mt-1 opacity-75">
                    Explore alternate spreads • {groupedDKProps.length} games
                </div>
            </button>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
            {#if activeTab === 'consensus'}
                <!-- Market Consensus View - Grouped by Game -->
                <div class="space-y-4">
                    {#if groupedOddsApiProps.length === 0}
                        <div class="text-center py-12">
                            {#if data.oddsApiProps.length === 0}
                                <p class="text-slate-400 mb-4">No market consensus data available.</p>
                                <a href="/api/test-props" class="text-primary underline font-semibold">Fetch Odds API props</a>
                            {:else}
                                <p class="text-slate-400">No props match your search.</p>
                            {/if}
                        </div>
                    {:else}
                        {#each groupedOddsApiProps as game}
                            <div class="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                <!-- Game Header (Collapsible) -->
                                <button
                                    on:click={() => toggleGame(game.gameId)}
                                    class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                >
                                    <div class="text-left">
                                        <h3 class="text-xl font-bold text-slate-100">
                                            {game.awayTeam} @ {game.homeTeam}
                                        </h3>
                                        <p class="text-sm text-slate-400 mt-1">
                                            {formatDate(game.commenceTime)} • {game.props.length} props
                                        </p>
                                    </div>
                                    <div class="text-slate-400 text-xl">
                                        {expandedGames.has(game.gameId) ? '▼' : '▶'}
                                    </div>
                                </button>

                                <!-- Game Props (Collapsible) -->
                                {#if expandedGames.has(game.gameId)}
                                    <div class="border-t border-slate-700 p-6 space-y-4">
                                        {#each game.props as prop}
                                            <div class="bg-slate-800 border border-slate-600 rounded-lg p-4">
                                                <!-- Player Header -->
                                                <div class="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 class="text-lg font-bold text-slate-100">{prop.playerName}</h4>
                                                    </div>
                                                    <div class="text-right">
                                                        <span class="px-3 py-1 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                                                            {formatPropType(prop.propType)}
                                                        </span>
                                                        <div class="text-xl font-bold text-slate-100 mt-2">
                                                            O/U {prop.line}
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Sportsbooks Grid -->
                                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                    {#each prop.allOdds as odds}
                                                        <div class="bg-slate-900 border border-slate-600 rounded p-2">
                                                            <div class="text-xs font-semibold text-slate-400 mb-2 text-center truncate">
                                                                {odds.sportsbook}
                                                            </div>
                                                            <div class="flex gap-2">
                                                                <div class="flex-1 text-center">
                                                                    <div class="text-xs text-slate-500 mb-1">O</div>
                                                                    <div class="text-sm font-bold text-success">
                                                                        {formatOdds(odds.overOdds)}
                                                                    </div>
                                                                </div>
                                                                <div class="flex-1 text-center">
                                                                    <div class="text-xs text-slate-500 mb-1">U</div>
                                                                    <div class="text-sm font-bold text-danger">
                                                                        {formatOdds(odds.underOdds)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            {:else}
                <!-- DraftKings Alt Lines View - Grouped by Game -->
                <div class="space-y-4">
                    {#if groupedDKProps.length === 0}
                        <div class="text-center py-12">
                            {#if data.dkProps.length === 0}
                                <p class="text-slate-400 mb-4">No DraftKings data available.</p>
                                <a href="/api/test-dk-save" class="text-primary underline font-semibold">Fetch DK props</a>
                            {:else}
                                <p class="text-slate-400">No props match your search.</p>
                            {/if}
                        </div>
                    {:else}
                        {#each groupedDKProps as game}
                            <div class="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                <!-- Game Header (Collapsible) -->
                                <button
                                    on:click={() => toggleGame(game.gameId)}
                                    class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                                >
                                    <div class="text-left">
                                        <h3 class="text-xl font-bold text-slate-100">
                                            {game.awayTeam} @ {game.homeTeam}
                                        </h3>
                                        <p class="text-sm text-slate-400 mt-1">
                                            {formatDate(game.commenceTime)} • {game.playerGroups.length} players
                                        </p>
                                    </div>
                                    <div class="text-slate-400 text-xl">
                                        {expandedGames.has(game.gameId) ? '▼' : '▶'}
                                    </div>
                                </button>

                                <!-- Game Props (Collapsible) -->
                                {#if expandedGames.has(game.gameId)}
                                    <div class="border-t border-slate-700 p-6 space-y-4">
                                        {#each game.playerGroups as playerGroup}
                                            <div class="bg-slate-800 border border-slate-600 rounded-lg p-4">
                                                <!-- Player Header -->
                                                <div class="flex items-center justify-between mb-3">
                                                    <h4 class="text-lg font-bold text-slate-100">{playerGroup.playerName}</h4>
                                                    <span class="px-3 py-1 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                                                        {formatPropType(playerGroup.propType)}
                                                    </span>
                                                </div>

                                                <!-- Alt Lines Table -->
                                                <div class="overflow-x-auto">
                                                    <table class="w-full">
                                                        <thead class="text-xs text-slate-400 border-b border-slate-700">
                                                            <tr>
                                                                <th class="text-left py-2 px-3">Line</th>
                                                                <th class="text-center py-2 px-3">Odds</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody class="divide-y divide-slate-700/50">
                                                            {#each playerGroup.lines as line}
                                                                <tr class="hover:bg-slate-900/50 transition-colors">
                                                                    <td class="py-2 px-3">
                                                                        <span class="font-semibold text-slate-100">
                                                                            Over {line.line}
                                                                        </span>
                                                                    </td>
                                                                    <td class="py-2 px-3 text-center">
                                                                        {#if line.odds}
                                                                            <span class="font-bold text-lg {line.odds.overOdds > 0 ? 'text-success' : 'text-slate-300'}">
                                                                                {formatOdds(line.odds.overOdds)}
                                                                            </span>
                                                                        {:else}
                                                                            <span class="text-slate-500">N/A</span>
                                                                        {/if}
                                                                    </td>
                                                                </tr>
                                                            {/each}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
