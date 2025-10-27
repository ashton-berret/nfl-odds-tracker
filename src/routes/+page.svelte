<script lang="ts">
    import type { User, Prop, Bet, BettingStats } from '$lib/types';

    export let data: {
        user?: User | null;
        recentBets: Bet[];
        stats: BettingStats | null;
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
        <div class="text-center py-20">
            <div class="mb-8">
                <h1 class="text-5xl font-bold text-slate-100 mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                    NFL Player Props Betting Simulator
                </h1>
                <p class="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                    Practice betting on NFL player props with fake money. No risk, all learning.
                </p>
            </div>

            <div class="flex justify-center gap-4">
                <a href="/register"
                    class="px-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold text-lg hover:shadow-glow-md transition-all hover:scale-105 btn-glow"
                >
                    Get Started Free
                </a>
                <a href="/props"
                    class="px-8 py-4 bg-slate-800 text-slate-100 rounded-lg font-bold text-lg hover:bg-slate-700 transition-all border border-slate-600 hover:border-slate-500"
                >
                    Browse Props
                </a>
            </div>

            <!-- Feature Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
                <div class="card">
                    <div class="text-4xl mb-3">📊</div>
                    <h3 class="text-lg font-bold text-slate-100 mb-2">Real Odds</h3>
                    <p class="text-slate-400 text-sm">Live odds from DraftKings, FanDuel, BetMGM and more</p>
                </div>
                <div class="card">
                    <div class="text-4xl mb-3">💰</div>
                    <h3 class="text-lg font-bold text-slate-100 mb-2">Paper Trading</h3>
                    <p class="text-slate-400 text-sm">Practice with $1000 fake money, zero risk</p>
                </div>
                <div class="card">
                    <div class="text-4xl mb-3">📈</div>
                    <h3 class="text-lg font-bold text-slate-100 mb-2">Track Performance</h3>
                    <p class="text-slate-400 text-sm">Detailed analytics and bet history</p>
                </div>
            </div>
        </div>
    {:else}
        <!-- Logged In Dashboard -->
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-slate-100">Welcome back, <span class="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">{user.username}</span>!</h1>
            <p class="text-slate-400 mt-2 text-lg">Here's your betting overview</p>
        </div>

        <!-- Stats Cards -->
        {#if stats}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Balance Card -->
                <div class="stat-card border-success group hover:shadow-glow-success">
                    <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Current Balance</div>
                    <div class="text-4xl font-bold text-success mb-1 group-hover:scale-110 transition-transform">
                        ${user.balance.toFixed(2)}
                    </div>
                    <div class="text-xs text-slate-500">Starting: $1000.00</div>
                </div>

                <!-- Total Bets Card -->
                <div class="stat-card border-primary group hover:shadow-glow-sm">
                    <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total Bets</div>
                    <div class="text-4xl font-bold text-slate-100 mb-1 group-hover:scale-110 transition-transform">
                        {stats.totalBets}
                    </div>
                    <div class="text-xs text-slate-500">
                        {stats.pendingBets} pending
                    </div>
                </div>

                <!-- Win Rate Card -->
                <div class="stat-card border-purple-500 group hover:shadow-glow-md">
                    <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Win Rate</div>
                    <div class="text-4xl font-bold text-purple-400 mb-1 group-hover:scale-110 transition-transform">
                        {stats.winRate}%
                    </div>
                    <div class="text-xs text-slate-500">
                        {stats.wonBets}W - {stats.lostBets}L
                    </div>
                </div>

                <!-- Profit/Loss Card -->
                <div class="stat-card {stats.totalProfit >= 0 ? 'border-success' : 'border-danger'} group {stats.totalProfit >= 0 ? 'hover:shadow-glow-success' : 'hover:shadow-glow-danger'}">
                    <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total P&L</div>
                    <div class="text-4xl font-bold {stats.totalProfit >= 0 ? 'text-success' : 'text-danger'} mb-1 group-hover:scale-110 transition-transform">
                        {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                    </div>
                    <div class="text-xs text-slate-500">
                        {stats.totalProfit >= 0 ? 'Profit' : 'Loss'}
                    </div>
                </div>
            </div>
        {/if}


        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Recent Bets -->
            <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                <div class="p-6 border-b border-slate-700 bg-slate-800/50">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-slate-100">Recent Bets</h2>
                        <a href="/my-bets" class="text-sm text-primary hover:text-primary-light font-semibold hover:underline">
                            View All →
                        </a>
                    </div>
                </div>
                <div class="divide-y divide-slate-700/50">
                    {#if recentBets.length === 0}
                        <div class="p-8 text-center text-slate-400">
                            No bets yet. <a href="/props" class="text-primary hover:underline">Browse props</a> to get started!
                        </div>
                    {:else}
                        {#each recentBets as bet}
                            <div class="p-5 hover:bg-slate-700/30 transition-colors">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <div class="font-semibold text-slate-100 text-lg">{bet.player}</div>
                                        <div class="text-sm text-slate-400 mt-1">
                                            {formatPropType(bet.propType)} <span class="text-slate-500">•</span> {bet.side} {bet.line}
                                        </div>
                                        <div class="text-xs text-slate-500 mt-2 font-medium">
                                            ${bet.amount} @ <span class="text-slate-400">{formatOdds(bet.odds)}</span>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <span class="badge
                                            {bet.status === 'won' ? 'badge-success' :
                                             bet.status === 'lost' ? 'badge-danger' :
                                             'badge-warning'}">
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
            <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                <div class="p-6 border-b border-slate-700 bg-slate-800/50">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-slate-100">Hot Props</h2>
                        <a href="/props" class="text-sm text-primary hover:text-primary-light font-semibold hover:underline">
                            View All →
                        </a>
                    </div>
                </div>
                <div class="divide-y divide-slate-700/50">
                    {#if topProps.length === 0}
                        <div class="p-8 text-center text-slate-400">
                            No props available yet.
                        </div>
                    {:else}
                        {#each topProps as prop}
                            <div class="p-5 hover:bg-slate-700/30 transition-colors">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-semibold text-slate-100 text-lg">{prop.playerName}</div>
                                        <div class="text-sm text-slate-400 mt-1">
                                            {formatPropType(prop.propType)} <span class="text-slate-500">•</span> {prop.line}
                                        </div>
                                    </div>
                                    <div class="flex gap-3">
                                        <div class="text-center">
                                            <div class="text-xs text-slate-500 mb-1">Over</div>
                                            <div class="font-bold text-success text-lg">{formatOdds(prop.bestOverOdds)}</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-xs text-slate-500 mb-1">Under</div>
                                            <div class="font-bold text-danger text-lg">{formatOdds(prop.bestUnderOdds)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
