<script lang="ts">
    import type { Prop } from '$lib/types';

    export let data: {
        props: Prop[];
        count: number;
        error?: string;
    };

    // User comes from parent layout
    import { page } from '$app/stores';
    $: user = $page.data.user;

    let showBetSlip = false;
    let selectedProp: any = null;
    let selectedSide: 'over' | 'under' = 'over';
    let selectedSportsbook: any = null;
    let betAmount = 100;
    let placing = false;
    let errorMessage = '';

    // Expandable rows state
    let expandedPropId: number | null = null;

    // Filter states
    let searchQuery = '';
    let selectedTeam = 'all';
    let selectedPropType = 'all';

    // Get unique teams and prop types for filters
    $: teams = ['all', ...new Set(data.props.flatMap((p: any) => [p.game.homeTeam, p.game.awayTeam]))];
    $: propTypes = ['all', ...new Set(data.props.map((p: any) => p.propType))];

    // Filtered props
    $: filteredProps = data.props.filter((prop: any) => {
        if (searchQuery && !prop.playerName.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (selectedTeam !== 'all') {
            if (prop.game.homeTeam !== selectedTeam && prop.game.awayTeam !== selectedTeam) {
                return false;
            }
        }
        if (selectedPropType !== 'all' && prop.propType !== selectedPropType) {
            return false;
        }
        return true;
    });

    function toggleExpand(propId: number) {
        console.log('[PROPS PAGE] Toggling expand for prop:', propId);
        expandedPropId = expandedPropId === propId ? null : propId;
    }

    function openBetSlip(prop: any, side: 'over' | 'under', sportsbook: any) {
        console.log('[PROPS PAGE] Opening bet slip:', { prop: prop.playerName, side, sportsbook: sportsbook.sportsbook });

        if (!user) {
            alert('Please log in to place bets');
            return;
        }

        selectedProp = prop;
        selectedSide = side;
        selectedSportsbook = sportsbook;
        showBetSlip = true;
        errorMessage = '';
    }

    async function placeBet() {
        if (!selectedProp || !selectedSportsbook || !user) return;

        console.log('[PROPS PAGE] Placing bet...', {
            prop: selectedProp.playerName,
            side: selectedSide,
            amount: betAmount,
            sportsbook: selectedSportsbook.sportsbook
        });

        placing = true;
        errorMessage = '';

        try {
            const odds = selectedSide === 'over'
                ? selectedSportsbook.overOdds
                : selectedSportsbook.underOdds;

            const sportsbookResponse = await fetch(`/api/sportsbooks?name=${encodeURIComponent(selectedSportsbook.sportsbook)}`);
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
                    odds: odds
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

    function formatPropType(propType: string): string {
        return propType
            .replace('player_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    function formatOdds(odds: number): string {
        return odds > 0 ? `+${odds}` : odds.toString();
    }

    function calculatePayout(amount: number, odds: number): number {
        if (odds > 0) {
            return amount + (amount * odds / 100);
        } else {
            return amount + (amount * 100 / Math.abs(odds));
        }
    }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
        <h1 class="text-4xl font-bold text-slate-100 mb-2">NFL Player Props</h1>
        <p class="text-slate-400 text-lg">Compare odds across sportsbooks and place your bets</p>
    </div>

    <!-- Filters -->
    <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Search -->
            <div>
                <label for="search" class="block text-sm font-semibold text-slate-300 mb-2">
                    Search Player
                </label>
                <input
                    id="search"
                    type="text"
                    bind:value={searchQuery}
                    placeholder="e.g., Patrick Mahomes"
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                />
            </div>

            <!-- Team Filter -->
            <div>
                <label for="team" class="block text-sm font-semibold text-slate-300 mb-2">
                    Team
                </label>
                <select
                    id="team"
                    bind:value={selectedTeam}
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    {#each teams as team}
                        <option value={team}>
                            {team === 'all' ? 'All Teams' : team}
                        </option>
                    {/each}
                </select>
            </div>

            <!-- Prop Type Filter -->
            <div>
                <label for="propType" class="block text-sm font-semibold text-slate-300 mb-2">
                    Prop Type
                </label>
                <select
                    id="propType"
                    bind:value={selectedPropType}
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    {#each propTypes as type}
                        <option value={type}>
                            {type === 'all' ? 'All Types' : formatPropType(type)}
                        </option>
                    {/each}
                </select>
            </div>
        </div>

        <div class="mt-4 text-sm text-slate-400 font-medium">
            Showing {filteredProps.length} of {data.count} props
        </div>
    </div>

    <!-- Props Table -->
    {#if filteredProps.length === 0}
        <div class="bg-warning/10 border border-warning/30 text-warning px-6 py-4 rounded-lg">
            {#if data.count === 0}
                No props available. Visit <a href="/api/test-props" class="underline font-semibold">fetch props endpoint</a> to load data.
            {:else}
                No props match your filters. Try adjusting your search criteria.
            {/if}
        </div>
    {:else}
        <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-slate-900/50 border-b border-slate-700">
                    <tr>
                        <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-48">Player</th>
                        <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-60">Game</th>
                        <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Prop</th>
                        <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider w-24">Line</th>
                        <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider w-32">Best Over</th>
                        <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider w-32">Best Under</th>
                        <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider w-28"></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/50">
                    {#each filteredProps as prop}
                        <!-- Main Row -->
                        <tr class="hover:bg-slate-700/30 transition-colors">
                            <td class="px-6 py-4">
                                <div class="font-semibold text-slate-100 text-lg">{prop.playerName}</div>
                            </td>
                            <td class="px-6 py-4 w-40">
                                <div class="text-sm text-slate-300 font-medium">{prop.game.awayTeam}</div>
                                <div class="text-xs text-slate-300 my-0.5">@</div>
                                <div class="text-sm text-slate-300 font-medium">{prop.game.homeTeam}</div>
                                <div class="text-xs text-slate-500 mt-1">
                                    {new Date(prop.game.commenceTime).toLocaleDateString()}
                                </div>
                            </td>
                            <td class="px-6 py-4 w-40">
                                <span class="px-3 py-1.5 text-xs font-bold rounded-full bg-primary/20 text-primary border border-primary/30">
                                    {formatPropType(prop.propType)}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <div class="text-2xl font-bold text-slate-100">{prop.line}</div>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <button
                                    on:click={() => {
                                        const bestBook = prop.allOdds.reduce((best: any, current: any) =>
                                            current.overOdds > best.overOdds ? current : best
                                        );
                                        openBetSlip(prop, 'over', bestBook);
                                    }}
                                    class="odds-btn odds-btn-over w-28"
                                >
                                    <div class="text-lg font-bold">{formatOdds(prop.bestOverOdds)}</div>
                                    <div class="text-xs mt-0.5 opacity-75">{prop.bestOverSportsbook}</div>
                                </button>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <button
                                    on:click={() => {
                                        const bestBook = prop.allOdds.reduce((best: any, current: any) =>
                                            current.underOdds > best.underOdds ? current : best
                                        );
                                        openBetSlip(prop, 'under', bestBook);
                                    }}
                                    class="odds-btn odds-btn-under w-28"
                                >
                                    <div class="text-lg font-bold">{formatOdds(prop.bestUnderOdds)}</div>
                                    <div class="text-xs mt-0.5 opacity-75">{prop.bestUnderSportsbook}</div>
                                </button>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <button
                                    on:click={() => toggleExpand(prop.id)}
                                    class="px-4 py-2 text-sm font-semibold text-primary hover:text-primary-light hover:bg-primary/10 rounded-lg transition-all"
                                >
                                    {expandedPropId === prop.id ? '▼ Hide All' : '► All Books'}
                                </button>
                            </td>
                        </tr>

                        <!-- Expanded Details Row -->
                        {#if expandedPropId === prop.id}
                            <tr class="bg-slate-900/50">
                                <td colspan="7" class="px-6 py-6">
                                    <div class="text-sm font-bold text-slate-300 mb-4">All Sportsbooks</div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {#each prop.allOdds as bookOdds}
                                            <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
                                                <div class="font-bold text-slate-100 mb-3 text-center">{bookOdds.sportsbook}</div>
                                                <div class="flex gap-2">
                                                    <button
                                                        on:click={() => openBetSlip(prop, 'over', bookOdds)}
                                                        class="flex-1 bg-success/10 hover:bg-success/20 border-2 border-success/30 hover:border-success/50 rounded-lg px-3 py-3 transition-all hover:scale-105"
                                                    >
                                                        <div class="text-xs text-success/70 mb-1">Over</div>
                                                        <div class="font-bold text-success text-lg">{formatOdds(bookOdds.overOdds)}</div>
                                                    </button>
                                                    <button
                                                        on:click={() => openBetSlip(prop, 'under', bookOdds)}
                                                        class="flex-1 bg-danger/10 hover:bg-danger/20 border-2 border-danger/30 hover:border-danger/50 rounded-lg px-3 py-3 transition-all hover:scale-105"
                                                    >
                                                        <div class="text-xs text-danger/70 mb-1">Under</div>
                                                        <div class="font-bold text-danger text-lg">{formatOdds(bookOdds.underOdds)}</div>
                                                    </button>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
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
                    {selectedSportsbook.sportsbook}
                </div>
            </div>

            <div class="mb-4">
                <div class="block text-sm font-semibold text-slate-300 mb-2">Odds</div>
                <div class="p-3 bg-slate-900 rounded-lg border border-slate-700 font-bold text-primary text-lg">
                    {formatOdds(selectedSide === 'over' ? selectedSportsbook.overOdds : selectedSportsbook.underOdds)}
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
                    ${calculatePayout(betAmount, selectedSide === 'over' ? selectedSportsbook.overOdds : selectedSportsbook.underOdds).toFixed(2)}
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
