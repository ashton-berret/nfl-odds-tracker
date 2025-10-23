<script lang="ts">
    import type { User, Prop, Bet, BettingStats } from '$lib/types';

    export let data: {
        user?: User | null;
        stats: BettingStats | null;
        recentBets: Bet[];
        topProps: Prop[];
        error?: string;
    };

    // User comes from parent layout
    $: user = data.user;
    $: stats = data.stats;
    $: recentBets = data.recentBets;
    $: topProps = data.topProps;

    function formatOdds(odds: number): string {
        return odds > 0 ? `+${odds}` : odds.toString();
    }

    function formatPropType(propType: string): string {
        return propType
            .replace('player_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if !user}
        <!-- Not Logged In View -->
        <div class="text-center py-12">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">
                NFL Player Props Betting Simulator
            </h1>
            <p class="text-xl text-gray-600 mb-8">
                Practice betting on NFL player props with fake money. No risk, all learning.
            </p>
            <div class="flex justify-center gap-4">
                <a href="/register"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    Get Started Free
                </a>
                <a href="/props"
                    class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                    Browse Props
                </a>
            </div>
        </div>
    {:else}
        <!-- Logged In Dashboard -->
        <div class="mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Welcome back, {user.username}!</h1>
            <p class="text-gray-600 mt-1">Here's your betting overview</p>
        </div>

        <!-- Stats Cards -->
        {#if stats}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Balance Card -->
                <div class="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div class="text-sm font-medium text-gray-600 uppercase">Current Balance</div>
                    <div class="text-3xl font-bold text-green-600 mt-2">
                        ${user.balance.toFixed(2)}
                    </div>
                </div>

                <!-- Total Bets Card -->
                <div class="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div class="text-sm font-medium text-gray-600 uppercase">Total Bets</div>
                    <div class="text-3xl font-bold text-gray-900 mt-2">
                        {stats.totalBets}
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                        {stats.pendingBets} pending
                    </div>
                </div>

                <!-- Win Rate Card -->
                <div class="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div class="text-sm font-medium text-gray-600 uppercase">Win Rate</div>
                    <div class="text-3xl font-bold text-gray-900 mt-2">
                        {stats.winRate}%
                    </div>
                    <div class="text-sm text-gray-500 mt-1">
                        {stats.wonBets}W - {stats.lostBets}L
                    </div>
                </div>

                <!-- Profit/Loss Card -->
                <div class="bg-white rounded-lg shadow p-6 border-l-4 {stats.totalProfit >= 0 ? 'border-green-500' : 'border-red-500'}">
                    <div class="text-sm font-medium text-gray-600 uppercase">Total P&L</div>
                    <div class="text-3xl font-bold {stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'} mt-2">
                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                    </div>
                </div>
            </div>
        {/if}

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Recent Bets -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold text-gray-900">Recent Bets</h2>
                        <a href="/my-bets" class="text-sm text-blue-600 hover:underline">
                            View All →
                        </a>
                    </div>
                </div>
                <div class="divide-y divide-gray-200">
                    {#if recentBets.length === 0}
                        <div class="p-6 text-center text-gray-500">
                            No bets yet. <a href="/props" class="text-blue-600 hover:underline">Browse props</a> to get started!
                        </div>
                    {:else}
                        {#each recentBets as bet}
                            <div class="p-4 hover:bg-gray-50">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <div class="font-medium text-gray-900">{bet.player}</div>
                                        <div class="text-sm text-gray-600">
                                            {formatPropType(bet.propType)} {bet.side} {bet.line}
                                        </div>
                                        <div class="text-xs text-gray-500 mt-1">
                                            ${bet.amount} @ {formatOdds(bet.odds)}
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="inline-block px-2 py-1 text-xs font-semibold rounded
                                            {bet.status === 'won' ? 'bg-green-100 text-green-800' :
                                             bet.status === 'lost' ? 'bg-red-100 text-red-800' :
                                             'bg-yellow-100 text-yellow-800'}">
                                            {bet.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
            <!-- Hot Props -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl font-bold text-gray-900">Hot Props</h2>
                        <a href="/props" class="text-sm text-blue-600 hover:underline">
                            View All →
                        </a>
                    </div>
                </div>
                <div class="divide-y divide-gray-200">
                    {#if topProps.length === 0}
                        <div class="p-6 text-center text-gray-500">
                            No props available yet.
                        </div>
                    {:else}
                        {#each topProps as prop}
                            <div class="p-4 hover:bg-gray-50">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-medium text-gray-900">{prop.playerName}</div>
                                        <div class="text-sm text-gray-600">
                                            {formatPropType(prop.propType)} {prop.line}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <div class="text-center">
                                            <div class="text-xs text-gray-500">Over</div>
                                            <div class="font-bold text-green-600">{formatOdds(prop.bestOverOdds)}</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-xs text-gray-500">Under</div>
                                            <div class="font-bold text-red-600">{formatOdds(prop.bestUnderOdds)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div class="flex gap-4">
                <a href="/props"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                    Browse Props
                </a>
                <a href="/my-bets"
                    class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                    View Bet History
                </a>
            </div>
        </div>
    {/if}
</div>
