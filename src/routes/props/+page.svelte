<script lang="ts">
    export let data;

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
        // Search filter
        if (searchQuery && !prop.playerName.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Team filter
        if (selectedTeam !== 'all') {
            if (prop.game.homeTeam !== selectedTeam && prop.game.awayTeam !== selectedTeam) {
                return false;
            }
        }

        // Prop type filter
        if (selectedPropType !== 'all' && prop.propType !== selectedPropType) {
            return false;
        }

        return true;
    });

    // Toggle expanded row
    function toggleExpand(propId: number) {
        console.log('[PROPS PAGE] Toggling expand for prop:', propId);
        expandedPropId = expandedPropId === propId ? null : propId;
    }

    // Open bet slip
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

    // Place bet
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

            // Find sportsbook ID
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

    // Helper functions
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
    <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">NFL Player Props</h1>
        <p class="text-gray-600 mt-1">Compare odds across sportsbooks and place your bets</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Search -->
            <div>
                <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
                    Search Player
                </label>
                <input
                    id="search"
                    type="text"
                    bind:value={searchQuery}
                    placeholder="e.g., Patrick Mahomes"
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            <!-- Team Filter -->
            <div>
                <label for="team" class="block text-sm font-medium text-gray-700 mb-2">
                    Team
                </label>
                <select
                    id="team"
                    bind:value={selectedTeam}
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label for="propType" class="block text-sm font-medium text-gray-700 mb-2">
                    Prop Type
                </label>
                <select
                    id="propType"
                    bind:value={selectedPropType}
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {#each propTypes as type}
                        <option value={type}>
                            {type === 'all' ? 'All Types' : formatPropType(type)}
                        </option>
                    {/each}
                </select>
            </div>
        </div>

        <div class="mt-4 text-sm text-gray-600">
            Showing {filteredProps.length} of {data.count} props
        </div>
    </div>

    <!-- Props Table -->
    {#if filteredProps.length === 0}
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {#if data.count === 0}
                No props available. Visit <a href="/api/test-props" class="underline">/api/test-props</a> to fetch data.
            {:else}
                No props match your filters. Try adjusting your search criteria.
            {/if}
        </div>
    {:else}
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Player</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Game</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prop</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Line</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Best Over</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Best Under</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    {#each filteredProps as prop}
                        <!-- Main Row -->
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4">
                                <div class="font-medium text-gray-900">{prop.playerName}</div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-sm">{prop.game.awayTeam} @ {prop.game.homeTeam}</div>
                                <div class="text-xs text-gray-500">
                                    {new Date(prop.game.commenceTime).toLocaleDateString()}
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {formatPropType(prop.propType)}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <div class="font-bold">{prop.line}</div>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <button
                                    on:click={() => {
                                        const bestBook = prop.allOdds.reduce((best: any, current: any) =>
                                            current.overOdds > best.overOdds ? current : best
                                        );
                                        openBetSlip(prop, 'over', bestBook);
                                    }}
                                    class="bg-green-100 hover:bg-green-200 px-3 py-2 rounded transition"
                                >
                                    <div class="font-bold text-green-700">{formatOdds(prop.bestOverOdds)}</div>
                                    <div class="text-xs text-gray-600">{prop.bestOverSportsbook}</div>
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
                                    class="bg-red-100 hover:bg-red-200 px-3 py-2 rounded transition"
                                >
                                    <div class="font-bold text-red-700">{formatOdds(prop.bestUnderOdds)}</div>
                                    <div class="text-xs text-gray-600">{prop.bestUnderSportsbook}</div>
                                </button>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <button
                                    on:click={() => toggleExpand(prop.id)}
                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    {expandedPropId === prop.id ? '▼ Hide' : '► Show All Books'}
                                </button>
                            </td>
                        </tr>

                        <!-- Expanded Details Row -->
                        {#if expandedPropId === prop.id}
                            <tr class="bg-gray-50">
                                <td colspan="7" class="px-6 py-4">
                                    <div class="text-sm font-semibold text-gray-700 mb-3">All Sportsbooks</div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {#each prop.allOdds as bookOdds}
                                            <div class="bg-white border border-gray-200 rounded-lg p-4">
                                                <div class="font-semibold text-gray-900 mb-3">{bookOdds.sportsbook}</div>
                                                <div class="flex gap-2">
                                                    <button
                                                        on:click={() => openBetSlip(prop, 'over', bookOdds)}
                                                        class="flex-1 bg-green-50 hover:bg-green-100 border border-green-200 rounded px-3 py-2 transition"
                                                    >
                                                        <div class="text-xs text-gray-600">Over</div>
                                                        <div class="font-bold text-green-700">{formatOdds(bookOdds.overOdds)}</div>
                                                    </button>
                                                    <button
                                                        on:click={() => openBetSlip(prop, 'under', bookOdds)}
                                                        class="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-3 py-2 transition"
                                                    >
                                                        <div class="text-xs text-gray-600">Under</div>
                                                        <div class="font-bold text-red-700">{formatOdds(bookOdds.underOdds)}</div>
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
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 class="text-2xl font-bold mb-4">Place Bet</h2>

            <div class="mb-4 p-4 bg-gray-50 rounded">
                <div class="font-semibold">{selectedProp.playerName}</div>
                <div class="text-sm text-gray-600">
                    {formatPropType(selectedProp.propType)} {selectedSide === 'over' ? 'Over' : 'Under'} {selectedProp.line}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                    {selectedProp.game.awayTeam} @ {selectedProp.game.homeTeam}
                </div>
            </div>

            <div class="mb-4">
                <div class="block text-sm font-medium mb-2">Sportsbook</div>
                <div class="p-3 bg-blue-50 rounded">
                    {selectedSportsbook.sportsbook}
                </div>
            </div>

            <div class="mb-4">
                <div class="block text-sm font-medium mb-2">Odds</div>
                <div class="p-3 bg-blue-50 rounded font-bold">
                    {formatOdds(selectedSide === 'over' ? selectedSportsbook.overOdds : selectedSportsbook.underOdds)}
                </div>
            </div>

            <div class="mb-4">
                <label for="bet-amount" class="block text-sm font-medium mb-2">Bet Amount ($)</label>
                <input
                    id="bet-amount"
                    type="number"
                    bind:value={betAmount}
                    min="1"
                    max={user?.balance || 0}
                    class="w-full border rounded px-3 py-2"
                />
            </div>

            <div class="mb-4 p-3 bg-green-50 rounded">
                <div class="text-sm text-gray-600">Potential Payout</div>
                <div class="text-xl font-bold text-green-600">
                    ${calculatePayout(betAmount, selectedSide === 'over' ? selectedSportsbook.overOdds : selectedSportsbook.underOdds).toFixed(2)}
                </div>
            </div>

            {#if errorMessage}
                <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {errorMessage}
                </div>
            {/if}

            <div class="flex gap-2">
                <button
                    on:click={placeBet}
                    disabled={placing}
                    class="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                    {placing ? 'Placing...' : 'Place Bet'}
                </button>
                <button
                    on:click={() => showBetSlip = false}
                    class="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
{/if}
