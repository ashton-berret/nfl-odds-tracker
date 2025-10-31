<script lang="ts">
    // src/routes/props/+page.svelte
    import { slide } from 'svelte/transition';
    export let data;

    // User comes from parent layout
    import { page } from '$app/stores';
    $: user = $page.data.user;

    let activeTab: 'draftkings' | 'consensus' = 'draftkings';

    // Filter states
    let searchQuery = '';
    let selectedPropType = 'all';
    let selectedTeam = 'all';
    let selectedTimeSlot = 'all';

    // Bet slip state
    let showBetSlip = false;
    let selectedProp: any = null;
    let selectedOdds: any = null;
    let selectedSide: 'over' | 'under' = 'over';
    let betAmount = 100;
    let placing = false;
    let errorMessage = '';

    let allExpanded = false;

    // Expandable game state
    let expandedGames = new Set<string>();

    // Track current alt line index per playerGroup (for carousel)
    // Using object instead of Map for better reactivity
    let carouselPositions: Record<string, number> = {};

    /**
     * Get carousel key for a playerGroup
     */
    function getCarouselKey(playerId: string, gameId: string, propType: string): string {
        return `${playerId}-${gameId}-${propType}`;
    }

    /**
     * Find line index with odds closest to 0 (even odds)
     */
    function findClosestToZeroIndex(lines: any[]): number {
        if (lines.length === 0) return 0;

        let closestIndex = 0;
        let closestDistance = Infinity;

        for (let i = 0; i < lines.length; i++) {
            const odds = lines[i]?.odds?.overOdds;
            if (odds !== null && odds !== undefined) {
                const distance = Math.abs(odds);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = i;
                }
            }
        }

        return closestIndex;
    }

    /**
     * Get current alt line index for a playerGroup
     */
    function getCurrentAltLineIndex(key: string, lines: any[]): number {
        const stored = carouselPositions[key];
        if (stored !== undefined) return stored;
        // Default to line with odds closest to 0
        return findClosestToZeroIndex(lines);
    }

    function nextAltLine(key: string, totalLines: number) {
        const current = carouselPositions[key];
        if (current !== undefined && current < totalLines - 1) {
            carouselPositions[key] = current + 1;
            carouselPositions = { ...carouselPositions };
        }
    }

    function prevAltLine(key: string, totalLines: number) {
        const current = carouselPositions[key];
        if (current !== undefined && current > 0) {
            carouselPositions[key] = current - 1;
            carouselPositions = { ...carouselPositions };
        }
    }

    /**
     * Calculate potential payout preview (assuming $100 bet)
     */
    function calculatePayoutPreview(odds: number | null | undefined): number {
        if (!odds) return 0;
        if (odds > 0) {
            return 100 + (100 * odds / 100);
        } else {
            return 100 + (100 * 100 / Math.abs(odds));
        }
    }

    /**
     * Get prop type display order
     */
    function getPropTypeOrder(propType: string): number {
        const order: Record<string, number> = {
            'player_pass_yds': 1,
            'player_rushing_yds': 2,
            'player_receiving_yds': 3,
            'player_receptions': 4,
            'player_passing_tds': 5,
            'player_rushing_tds': 6,
            'player_receiving_tds': 7,
            'player_anytime_td': 8,
            'player_first_td': 9,
            'player_2plus_td': 10
        };
        return order[propType] || 99;
    }

    /**
     * Get unique prop types for filter dropdown
     */
    $: allPropTypes = (() => {
        const types = new Set<string>();
        if (activeTab === 'draftkings') {
            data.oddsApiProps.forEach((p: any) => types.add(p.propType));
        } else {
            data.dkProps.forEach((pg: any) => types.add(pg.propType));
        }
        return Array.from(types).sort();
    })();

    /**
     * Get unique teams for filter dropdown
     */
    $: allTeams = (() => {
        const teams = new Set<string>();
        if (activeTab === 'draftkings') {
            data.oddsApiProps.forEach((p: any) => {
                teams.add(p.game.homeTeam);
                teams.add(p.game.awayTeam);
            });
        } else {
            data.dkProps.forEach((pg: any) => {
                teams.add(pg.game.homeTeam);
                teams.add(pg.game.awayTeam);
            });
        }
        return Array.from(teams).sort();
    })();

    /**
     * auto reset carousel positions when filters change
     */
    $: if (searchQuery || selectedPropType || selectedTeam || selectedTimeSlot) {
        console.log(`[CAROUSEL RESET] Filters changed, clearing all carousel positions`);
        carouselPositions = {};
    }


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
     * determine time slot based on game time
     */
    function getGameTimeSlot(commenceTime: string): string {
        const date = new Date(commenceTime);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        if (dayOfWeek === 4) return 'thursday';
        if (dayOfWeek === 0) {
            if (hour < 13) return 'sunday_early';
            if (hour < 19) return 'sunday_afternoon';
            return 'sunday_night';
        }
        if (dayOfWeek === 1) return 'monday';

        return 'other';
    }


    /**
     * Toggle game expansion
     */
    function toggleGame(gameId: string) {
        if (expandedGames.has(gameId)) {
            console.log('[CAROUSEL RESET] Game collapsed, clearing positions for gameId:', gameId);

            const keysToDelete: string[] = [];
            for (const key in carouselPositions) {
                if (key.includes(gameId)) {
                    keysToDelete.push(key);
                }
            }

            keysToDelete.forEach(key => {
                delete carouselPositions[key];
                console.log('[CAROUSEL RESET] Cleared position for key:', key);
            });

            carouselPositions = {...carouselPositions};
            expandedGames.delete(gameId);
        } else {
            console.log('[CAROUSEL] Game Expanded: ', gameId);
            expandedGames.add(gameId);
        }

        expandedGames = expandedGames;
    }

    /**
     * Expand all games
     */
    function toggleExpandAll() {
        if (allExpanded) {
            expandedGames = new Set();
        } else {
            if (activeTab === 'consensus') {
                expandedGames = new Set(groupedOddsApiProps.map((g: any) => g.gameId));
            } else {
                expandedGames = new Set(groupedDKProps.map((g: any) => g.gameId));
            }
        }
        allExpanded = !allExpanded;
    }

    /**
     * Clear all filters
     */
    function clearFilters() {
        searchQuery = '';
        selectedPropType = 'all';
        selectedTeam = 'all';
        selectedTimeSlot = 'all';
    }

    /**
     * Open bet slip modal
     */
    function openBetSlip(prop: any, side: 'over' | 'under', odds: any) {
        console.log('[PROPS PAGE] Opening bet slip:', { player: prop.playerName, side, odds });

        if (!user) {
            alert('Please log in to place bets');
            return;
        }

        selectedProp = prop;
        selectedSide = side;
        selectedOdds = odds;
        showBetSlip = true;
        errorMessage = '';
    }

    /**
     * Place bet
     */
    async function placeBet() {
        if (!selectedProp || !selectedOdds || !user) return;

        console.log('[PROPS PAGE] Placing bet...', {
            prop: selectedProp.playerName || selectedProp.player?.name,
            side: selectedSide,
            amount: betAmount,
            odds: selectedOdds
        });

        placing = true;
        errorMessage = '';

        try {
            const oddsValue = selectedSide === 'over' ? selectedOdds.overOdds : selectedOdds.underOdds;

            // Get sportsbook ID
            const sportsbookResponse = await fetch(`/api/sportsbooks?name=${encodeURIComponent(selectedOdds.sportsbook)}`);
            const sportsbookData = await sportsbookResponse.json();

            console.log('[PROPS PAGE] Sportsbook ID:', sportsbookData.id);

            const response = await fetch('/api/bets/place', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propId: selectedProp.id,
                    sportsbookId: sportsbookData.id,
                    side: selectedSide,
                    amount: betAmount,
                    odds: oddsValue
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('[PROPS PAGE] Bet placed successfully! New balance:', result.newBalance);
                showBetSlip = false;
                alert('Bet placed successfully!');
                window.location.reload();
            } else {
                console.error('[PROPS PAGE] Bet placement failed:', result.error);
                errorMessage = result.error;
            }
        } catch (error) {
            console.error('[PROPS PAGE] Error placing bet:', error);
            errorMessage = 'Failed to place bet';
        } finally {
            placing = false;
        }
    }

    /**
     * Calculate potential payout
     */
    function calculatePayout(amount: number, odds: number): number {
        if (odds > 0) {
            return amount + (amount * odds / 100);
        } else {
            return amount + (amount * 100 / Math.abs(odds));
        }
    }

    // Filtered Odds API props with all filters
    $: filteredOddsApiProps = data.oddsApiProps.filter((prop: any) => {
        // Search filter
        if (searchQuery) {
            const normalizedSearch = normalizePlayerName(searchQuery);
            const normalizedPlayer = normalizePlayerName(prop.playerName);
            if (!normalizedPlayer.includes(normalizedSearch)) {
                return false;
            }
        }

        // Prop type filter
        if (selectedPropType !== 'all' && prop.propType !== selectedPropType) {
            return false;
        }

        // Team filter
        if (selectedTeam !== 'all') {
            if (prop.game.homeTeam !== selectedTeam && prop.game.awayTeam !== selectedTeam) {
                return false;
            }
        }

        if (selectedTimeSlot !== 'all') {
            const gameSlot = getGameTimeSlot(prop.game.commenceTime);
            if (gameSlot !== selectedTimeSlot) {
                return false;
            }
        }

        return true;
    });

    // Filtered DK props with all filters
    $: filteredDKProps = data.dkProps.filter((playerGroup: any) => {
        // Search filter
        if (searchQuery) {
            const normalizedSearch = normalizePlayerName(searchQuery);
            const normalizedPlayer = normalizePlayerName(playerGroup.playerName);
            if (!normalizedPlayer.includes(normalizedSearch)) {
                return false;
            }
        }

        // Prop type filter
        if (selectedPropType !== 'all' && playerGroup.propType !== selectedPropType) {
            return false;
        }

        // Team filter
        if (selectedTeam !== 'all') {
            if (playerGroup.game.homeTeam !== selectedTeam && playerGroup.game.awayTeam !== selectedTeam) {
                return false;
            }
        }

        if (selectedTimeSlot !== 'all') {
            const gameSlot = getGameTimeSlot(playerGroup.game.commenceTime);
            if (gameSlot !== selectedTimeSlot) {
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

    // Group DK props by game, then by prop type
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
                    propTypes: new Map()
                });
            }

            // Group by prop type
            const propTypeKey = playerGroup.propType;
            if (!grouped.get(gameId).propTypes.has(propTypeKey)) {
                grouped.get(gameId).propTypes.set(propTypeKey, {
                    propType: propTypeKey,
                    playerGroups: []
                });
            }
            grouped.get(gameId).propTypes.get(propTypeKey).playerGroups.push(playerGroup);
        }

        // Convert Maps to arrays and sort
        return Array.from(grouped.values()).map((game: any) => ({
            gameId: game.gameId,
            awayTeam: game.awayTeam,
            homeTeam: game.homeTeam,
            commenceTime: game.commenceTime,
            propTypes: Array.from(game.propTypes.values())
                .map((pt: any) => ({
                    propType: pt.propType,
                    playerGroups: pt.playerGroups.sort((a: any, b: any) =>
                        a.playerName.localeCompare(b.playerName)
                    )
                }))
                .sort((a: any, b: any) => getPropTypeOrder(a.propType) - getPropTypeOrder(b.propType))
        })).sort((a: any, b: any) =>
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
    <div class="mb-8 flex items-center justify-between">
        <div>
            <h1 class="text-4xl font-bold text-slate-100 mb-2">NFL Player Props</h1>
            <p class="text-slate-400 text-lg">Compare odds and explore alternate lines</p>
        </div>
        <button
            on:click={toggleExpandAll}
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-semibold transition-colors whitespace-nowrap"
        >
            {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
    </div>
    <!-- Search Bar + Filters + Controls -->
    <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols- gap-3">
            <!-- Search -->
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search player..."
                class="bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
            />

            <!-- Prop Type Filter -->
            <select
                bind:value={selectedPropType}
                class="bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
                <option value="all">All Prop Types</option>
                {#each allPropTypes as propType}
                    <option value={propType}>{formatPropType(propType)}</option>
                {/each}
            </select>

            <!-- Team Filter -->
            <select
                bind:value={selectedTeam}
                class="bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
                <option value="all">All Teams</option>
                {#each allTeams as team}
                    <option value={team}>{team}</option>
                {/each}
            </select>

            <!-- Time Slot Filter -->
            <select
                bind:value={selectedTimeSlot}
                class="bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
                <option value="all">All Time Slots</option>
                <option value="thursday">Thursday Night</option>
                <option value="sunday_early">Sunday Early (12pm CT)</option>
                <option value="sunday_afternoon">Sunday Afternoon (3pm CT)</option>
                <option value="sunday_night">Sunday Night</option>
                <option value="monday">Monday Night</option>
            </select>

        </div>

        <!-- Clear Filters + Results Count -->
        {#if searchQuery || selectedPropType !== 'all' || selectedTeam !== 'all'}
            <div class="mt-3 flex items-center gap-3">
                <button
                    on:click={clearFilters}
                    class="text-sm text-primary hover:text-primary-light font-semibold"
                >
                    Clear all filters
                </button>
                <span class="text-xs text-slate-500">
                    {activeTab === 'draftkings' ? filteredOddsApiProps.length : filteredDKProps.length} props shown
                </span>
            </div>
        {/if}
    </div>

    <!-- Tabs -->
    <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 mb-6">
        <div class="flex border-b border-slate-700">
            <!-- DraftKings first -->
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

            <!-- Market Consensus second -->
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
        </div>

        <!-- Tab Content -->
        <div class="p-6">
            {#if activeTab === 'draftkings'}
                <!-- DraftKings Alt Lines View - Grouped by Game -->
                <div class="space-y-4">
                    {#if groupedDKProps.length === 0}
                        <div class="text-center py-12">
                            {#if data.dkProps.length === 0}
                                <p class="text-slate-400 mb-4">No DraftKings data available.</p>
                                <a href="/admin" class="text-primary underline font-semibold">Go to Admin Panel to fetch props</a>
                            {:else}
                                <p class="text-slate-400">No props match your filters.</p>
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
                                            {formatDate(game.commenceTime)} • {game.propTypes.reduce((sum: number, pt: any) => sum + pt.playerGroups.length, 0)} players
                                        </p>
                                    </div>
                                    <div class="text-slate-400 text-xl">
                                        {expandedGames.has(game.gameId) ? '▼' : '▶'}
                                    </div>
                                </button>

                                <!-- Game Props (Collapsible) -->
                                {#if expandedGames.has(game.gameId)}
                                    <div class="border-t border-slate-700 p-6 space-y-6">
                                        {#each game.propTypes as propTypeGroup}
                                            <!-- Prop Type Section -->
                                            <div>
                                                <h4 class="text-lg font-bold text-slate-100 mb-4 pb-2 border-b border-slate-700">
                                                    {formatPropType(propTypeGroup.propType)}
                                                </h4>
                                                <div class="space-y-4">
                                                    {#each propTypeGroup.playerGroups as playerGroup}
                                                        {@const carouselKey = getCarouselKey(playerGroup.playerId, playerGroup.game.id, playerGroup.propType)}

                                                        <div class="bg-slate-800 border border-slate-600 rounded-lg p-4">
                                                            <!-- Player Header -->
                                                            <div class="flex items-center justify-between mb-4">
                                                                <h5 class="text-base font-bold text-slate-100">{playerGroup.playerName}</h5>
                                                                {#if playerGroup.lines.length > 0}
                                                                    <span class="text-xs text-slate-400">
                                                                        {playerGroup.lines.length} alt {playerGroup.lines.length === 1 ? 'line' : 'lines'}
                                                                    </span>
                                                                {/if}
                                                            </div>

                                                            <!-- Alt Lines Card Carousel -->
                                                            {#if playerGroup.lines && playerGroup.lines.length > 0}
                                                                {#key carouselPositions[carouselKey] ?? findClosestToZeroIndex(playerGroup.lines)}
                                                                    {@const currentIndex = getCurrentAltLineIndex(carouselKey, playerGroup.lines)}
                                                                    {@const prevIndex = currentIndex > 0 ? currentIndex - 1 : null}
                                                                    {@const nextIndex = currentIndex < playerGroup.lines.length - 1 ? currentIndex + 1 : null}
                                                                    {@const currentLine = playerGroup.lines[currentIndex]}
                                                                <div class="relative">
                                                                    <!-- Carousel Wrapper -->
                                                                    <div class="relative overflow-hidden px-12 py-4">
                                                                        <div class="flex items-center justify-center gap-4 transition-all duration-300 ease-in-out" style="transform: translateX(0);">
                                                                            <!-- Previous Card (peek, faded) -->
                                                                            {#if prevIndex !== null}
                                                                                {@const prevLine = playerGroup.lines[prevIndex]}
                                                                                <div class="flex-shrink-0 w-48 opacity-50 scale-90 transition-all duration-300 ease-in-out pointer-events-none">
                                                                                    <div class="bg-slate-900 border border-slate-700 rounded-xl p-4 h-48 flex flex-col items-center justify-center">
                                                                                        <div class="text-sm text-slate-400 font-semibold mb-2">
                                                                                            Over {prevLine.line}
                                                                                        </div>
                                                                                        <div class="text-2xl font-bold {prevLine.odds?.overOdds > 0 ? 'text-success' : 'text-slate-200'} mb-2">
                                                                                            {prevLine.odds ? formatOdds(prevLine.odds.overOdds) : 'N/A'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            {/if}

                                                                            <!-- Current Card (center, full) -->
                                                                            <div class="flex-shrink-0 w-64 opacity-100 scale-100 transition-all duration-300 ease-in-out">
                                                                                <div class="bg-slate-900 border-2 border-primary/50 rounded-xl p-6 shadow-xl h-56 flex flex-col items-center justify-center gap-4">
                                                                                    <div class="text-lg text-slate-300 font-bold">
                                                                                        Over {currentLine.line}
                                                                                    </div>
                                                                                    {#if currentIndex === findClosestToZeroIndex(playerGroup.lines)}
                                                                                        <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                                                                                            Main Line
                                                                                        </span>
                                                                                    {/if}
                                                                                    <div class="text-4xl font-bold {currentLine.odds?.overOdds > 0 ? 'text-success' : 'text-slate-200'}">
                                                                                        {currentLine.odds ? formatOdds(currentLine.odds.overOdds) : 'N/A'}
                                                                                    </div>
                                                                                    {#if currentLine.odds && currentLine.odds.overOdds !== null}
                                                                                        <div class="text-xs text-slate-400">
                                                                                            Payout: ${calculatePayoutPreview(currentLine.odds.overOdds).toFixed(2)}
                                                                                        </div>
                                                                                        <button
                                                                                            class="w-full px-4 py-2 bg-gradient-to-r from-success to-success-dark hover:from-success-dark hover:to-success text-white rounded-lg font-bold text-sm transition-all hover:scale-105 shadow-lg"
                                                                                            on:click={() => openBetSlip({
                                                                                                id: currentLine.id,
                                                                                                playerName: playerGroup.playerName,
                                                                                                propType: playerGroup.propType,
                                                                                                line: currentLine.line,
                                                                                                game: playerGroup.game
                                                                                            }, 'over', {
                                                                                                sportsbook: currentLine.odds.sportsbook.name,
                                                                                                overOdds: currentLine.odds.overOdds
                                                                                            })}
                                                                                        >
                                                                                            Place Bet
                                                                                        </button>
                                                                                    {:else}
                                                                                        <div class="text-xs text-slate-500">No odds available</div>
                                                                                    {/if}
                                                                                </div>
                                                                            </div>

                                                                            <!-- Next Card (peek, faded) -->
                                                                            {#if nextIndex !== null}
                                                                                {@const nextLine = playerGroup.lines[nextIndex]}
                                                                                <div class="flex-shrink-0 w-48 opacity-50 scale-90 transition-all duration-300 ease-in-out pointer-events-none">
                                                                                    <div class="bg-slate-900 border border-slate-700 rounded-xl p-4 h-48 flex flex-col items-center justify-center">
                                                                                        <div class="text-sm text-slate-400 font-semibold mb-2">
                                                                                            Over {nextLine.line}
                                                                                        </div>
                                                                                        <div class="text-2xl font-bold {nextLine.odds?.overOdds > 0 ? 'text-success' : 'text-slate-200'} mb-2">
                                                                                            {nextLine.odds ? formatOdds(nextLine.odds.overOdds) : 'N/A'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            {/if}
                                                                        </div>

                                                                        <!-- Left Arrow -->
                                                                        {#if currentIndex > 0}
                                                                            <button
                                                                                class="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-all z-10 backdrop-blur-sm"
                                                                                on:click|stopPropagation={() => {
                                                                                    const current = carouselPositions[carouselKey];
                                                                                    if (current !== undefined && current > 0) {
                                                                                        carouselPositions[carouselKey] = current - 1;
                                                                                        carouselPositions = { ...carouselPositions };
                                                                                    } else {
                                                                                        // Initialize and go to previous
                                                                                        const defaultIdx = findClosestToZeroIndex(playerGroup.lines);
                                                                                        if (defaultIdx > 0) {
                                                                                            carouselPositions[carouselKey] = defaultIdx - 1;
                                                                                            carouselPositions = { ...carouselPositions };
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                aria-label="Previous alt line"
                                                                            >
                                                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                                                                </svg>
                                                                            </button>
                                                                        {/if}

                                                                        <!-- Right Arrow -->
                                                                        {#if currentIndex < playerGroup.lines.length - 1}
                                                                            <button
                                                                                class="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-all z-10 backdrop-blur-sm"
                                                                                on:click|stopPropagation={() => {
                                                                                    const current = carouselPositions[carouselKey];
                                                                                    if (current !== undefined && current < playerGroup.lines.length - 1) {
                                                                                        carouselPositions[carouselKey] = current + 1;
                                                                                        carouselPositions = { ...carouselPositions };
                                                                                    } else {
                                                                                        // Initialize and go to next
                                                                                        const defaultIdx = findClosestToZeroIndex(playerGroup.lines);
                                                                                        if (defaultIdx < playerGroup.lines.length - 1) {
                                                                                            carouselPositions[carouselKey] = defaultIdx + 1;
                                                                                            carouselPositions = { ...carouselPositions };
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                aria-label="Next alt line"
                                                                            >
                                                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                                                                </svg>
                                                                            </button>
                                                                        {/if}
                                                                    </div>

                                                                    <!-- Dot Indicators -->
                                                                    <div class="flex items-center justify-center gap-2 mt-4">
                                                                        {#each playerGroup.lines as _, i}
                                                                            <button
                                                                                class="w-2 h-2 rounded-full transition-all {i === currentIndex ? 'bg-primary w-6' : 'bg-slate-600 hover:bg-slate-500'}"
                                                                                on:click={() => {
                                                                                    carouselPositions[carouselKey] = i;
                                                                                    carouselPositions = { ...carouselPositions };
                                                                                }}
                                                                                aria-label="Go to line {i + 1}"
                                                                            ></button>
                                                                        {/each}
                                                                    </div>

                                                                    {#if currentIndex !== findClosestToZeroIndex(playerGroup.lines)}
                                                                            <div class="text-center mt-2">
                                                                                <button
                                                                                    class="text-xs -text-primary hover:text-primary-light font-semibold"
                                                                                    on:click={() => {
                                                                                        carouselPositions[carouselKey] = findClosestToZeroIndex(playerGroup.lines);
                                                                                        carouselPositions = { ...carouselPositions };
                                                                                    }}
                                                                                >
                                                                                    ← Back to Main Line
                                                                                </button>
                                                                            </div>
                                                                    {/if}
                                                                </div>
                                                                {/key}
                                                            {/if}
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
                <!-- Market Consensus View - Grouped by Game -->
                <div class="space-y-4">
                    {#if groupedOddsApiProps.length === 0}
                        <div class="text-center py-12">
                            {#if data.oddsApiProps.length === 0}
                                <p class="text-slate-400 mb-4">No market consensus data available.</p>
                                <a href="/admin" class="text-primary underline font-semibold">Go to Admin Panel to fetch props</a>
                            {:else}
                                <p class="text-slate-400">No props match your filters.</p>
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
                                                                <!-- Over Button -->
                                                                {#if odds.overOdds !== null && odds.overOdds !== undefined}
                                                                    <button
                                                                        on:click={() => openBetSlip(prop, 'over', odds)}
                                                                        class="flex-1 text-center hover:bg-success/20 border border-success/30 hover:border-success/50 rounded p-1 transition-all hover:scale-105"
                                                                    >
                                                                        <div class="text-xs text-slate-500 mb-1">O</div>
                                                                        <div class="text-sm font-bold text-success">
                                                                            {formatOdds(odds.overOdds)}
                                                                        </div>
                                                                    </button>
                                                                {:else}
                                                                    <div class="flex-1 text-center bg-slate-700/30 border border-slate-600/30 rounded p-1">
                                                                        <div class="text-xs text-slate-500 mb-1">O</div>
                                                                        <div class="text-sm font-bold text-slate-500">N/A</div>
                                                                    </div>
                                                                {/if}

                                                                <!-- Under Button -->
                                                                {#if odds.underOdds !== null && odds.underOdds !== undefined}
                                                                    <button
                                                                        on:click={() => openBetSlip(prop, 'under', odds)}
                                                                        class="flex-1 text-center hover:bg-danger/20 border border-danger/30 hover:border-danger/50 rounded p-1 transition-all hover:scale-105"
                                                                    >
                                                                        <div class="text-xs text-slate-500 mb-1">U</div>
                                                                        <div class="text-sm font-bold text-danger">
                                                                            {formatOdds(odds.underOdds)}
                                                                        </div>
                                                                    </button>
                                                                {:else}
                                                                    <div class="flex-1 text-center bg-slate-700/30 border border-slate-600/30 rounded p-1">
                                                                        <div class="text-xs text-slate-500 mb-1">U</div>
                                                                        <div class="text-sm font-bold text-slate-500">N/A</div>
                                                                    </div>
                                                                {/if}
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
            {/if}
        </div>
    </div>
</div>

<!-- Bet Slip Modal -->
{#if showBetSlip && selectedProp}
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 class="text-2xl font-bold text-slate-100 mb-6">Place Bet</h2>

            <div class="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                <div class="font-bold text-slate-100 text-lg">{selectedProp.playerName}</div>
                <div class="text-sm text-slate-300 mt-2">
                    {formatPropType(selectedProp.propType)} {selectedSide === 'over' ? 'Over' : 'Under'} {selectedProp.line}
                </div>
                <div class="text-sm text-slate-400 mt-1">
                    {selectedProp.game.awayTeam} @ {selectedProp.game.homeTeam}
                </div>
            </div>

            <div class="mb-4">
                <div class="block text-sm font-semibold text-slate-300 mb-2">Sportsbook</div>
                <div class="p-3 bg-slate-900 rounded-lg border border-slate-700 text-slate-100 font-medium">
                    {selectedOdds.sportsbook}
                </div>
            </div>

            <div class="mb-4">
                <div class="block text-sm font-semibold text-slate-300 mb-2">Odds</div>
                <div class="p-3 bg-slate-900 rounded-lg border border-slate-700 font-bold text-primary text-lg">
                    {formatOdds(selectedSide === 'over' ? selectedOdds.overOdds : selectedOdds.underOdds)}
                </div>
            </div>

            <div class="mb-6">
                <label for="bet-amount" class="block text-sm font-semibold text-slate-300 mb-2">Bet Amount ($)</label>
                <input
                    id="bet-amount"
                    type="number"
                    bind:value={betAmount}
                    min="1"
                    max={user?.balance || 0}
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-primary focus:border-transparent"
                />
            </div>

            <div class="mb-6 p-4 bg-gradient-to-r from-success/10 to-success/5 rounded-lg border border-success/30">
                <div class="text-sm text-slate-400 mb-1">Potential Payout</div>
                <div class="text-2xl font-bold text-success">
                    ${calculatePayout(betAmount, selectedSide === 'over' ? selectedOdds.overOdds : selectedOdds.underOdds).toFixed(2)}
                </div>
            </div>

            {#if errorMessage}
                <div class="mb-4 p-4 bg-danger/10 text-danger rounded-lg border border-danger/30">
                    {errorMessage}
                </div>
            {/if}

            <div class="flex gap-3">
                <button
                    on:click={placeBet}
                    disabled={placing}
                    class="flex-1 bg-gradient-to-r from-success to-success-dark text-white px-6 py-3 rounded-lg font-bold hover:shadow-glow-success transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {placing ? 'Placing...' : 'Place Bet'}
                </button>
                <button
                    on:click={() => showBetSlip = false}
                    class="flex-1 bg-slate-700 border border-slate-600 text-slate-100 px-6 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}
