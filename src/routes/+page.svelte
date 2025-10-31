<script lang="ts">
    export let data;

    import { page } from '$app/stores';
    $: user = $page.data.user;

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

    function formatCurrency(amount: number): string {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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
    <!-- Hero Section -->
    <div class="mb-8">
        <h1 class="text-4xl font-bold text-slate-100 mb-2">
            {user ? `Welcome back, ${user.username}!` : 'Welcome to NFL Props Tracker'}
        </h1>
        <p class="text-slate-400 text-lg">
            {user
                ? 'Track your bets, compare odds, and find the best value'
                : 'Paper trade NFL player props with $10,000 virtual money'}
        </p>
    </div>

    {#if user}
        <!-- User Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <!-- Balance -->
            <div class="stat-card border-primary group hover:shadow-glow-md">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Current Balance</div>
                <div class="text-4xl font-bold text-slate-100 group-hover:scale-110 transition-transform">
                    ${formatCurrency(user.balance)}
                </div>
            </div>

            <!-- Total Bets -->
            <div class="stat-card border-primary group hover:shadow-glow-sm">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total Bets</div>
                <div class="text-4xl font-bold text-slate-100 group-hover:scale-110 transition-transform">
                    {data.userStats?.totalBets || 0}
                </div>
            </div>

            <!-- Win Rate -->
            <div class="stat-card border-primary group hover:shadow-glow-md">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Win Rate</div>
                <div class="text-4xl font-bold text-slate-100 group-hover:scale-110 transition-transform">
                    {data.userStats?.winRate || '0.0'}%
                </div>
                <div class="text-xs text-slate-500 mt-2">
                    <span class="text-success">{data.userStats?.wonBets || 0}W</span>
                    <span class="text-slate-600"> / </span>
                    <span class="text-danger">{data.userStats?.lostBets || 0}L</span>
                    <span class="text-slate-600"> / </span>
                    <span class="text-warning">{data.userStats?.pendingBets || 0}P</span>
                </div>
            </div>

            <!-- Total Profit/Loss -->
            <div class="stat-card {(data.userStats?.totalProfit || 0) >= 0 ? 'border-success' : 'border-danger'} group {(data.userStats?.totalProfit || 0) >= 0 ? 'hover:shadow-glow-success' : 'hover:shadow-glow-danger'}">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total P&L</div>
                <div class="text-4xl font-bold {(data.userStats?.totalProfit || 0) >= 0 ? 'text-success' : 'text-danger'} group-hover:scale-110 transition-transform">
                    {(data.userStats?.totalProfit || 0) >= 0 ? '+' : ''}${formatCurrency(data.userStats?.totalProfit || 0)}
                </div>
            </div>

        </div>

        <!-- Recent Bets and Hot Props Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Recent Bets Section -->
            <div>
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-slate-100">Recent Bets</h2>
                    <a href="/my-bets" class="text-primary hover:text-primary-light font-semibold hover:underline">
                        View All →
                    </a>
                </div>

                {#if data.recentBets && data.recentBets.length > 0}
                    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <table class="w-full">
                            <thead class="bg-slate-900/50 border-b border-slate-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase">Bet</th>
                                    <th class="px-4 py-3 text-center text-xs font-bold text-slate-300 uppercase">Amount</th>
                                    <th class="px-4 py-3 text-center text-xs font-bold text-slate-300 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-700/50">
                                {#each data.recentBets as bet}
                                    <tr class="hover:bg-slate-700/30 transition-colors">
                                        <td class="px-4 py-4">
                                            <div class="font-semibold text-slate-100">{bet.prop.player.name}</div>
                                            <div class="text-sm text-slate-400 mt-1">
                                                {formatPropType(bet.prop.propType)}
                                                <span class="font-bold uppercase {bet.side === 'over' ? 'text-success' : 'text-danger'}">
                                                    {bet.side}
                                                </span>
                                                <span class="text-slate-100">{bet.prop.line}</span>
                                            </div>
                                        </td>
                                        <td class="px-4 py-4 text-center font-bold text-slate-100">
                                            ${formatCurrency(bet.amount)}
                                        </td>
                                        <td class="px-4 py-4 text-center">
                                            <span class="badge
                                                {bet.status === 'won' ? 'badge-success' :
                                                 bet.status === 'lost' ? 'badge-danger' :
                                                 'badge-warning'}">
                                                {bet.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <div class="text-slate-400 mb-4">You haven't placed any bets yet</div>
                        <a href="/props" class="inline-block px-6 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105">
                            Browse Props
                        </a>
                    </div>
                {/if}
            </div>

            <!-- Hot Props Section -->
            <div>
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-slate-100">Hot Props</h2>
                    <a href="/props" class="text-primary hover:text-primary-light font-semibold hover:underline">
                        View All →
                    </a>
                </div>

                {#if data.hotProps && data.hotProps.length > 0}
                    <div class="space-y-4">
                        {#each data.hotProps.slice(0, 5) as prop}
                            <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-primary/50 transition-all hover:shadow-lg">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <h3 class="text-base font-bold text-slate-100">{prop.playerName}</h3>
                                        <p class="text-xs text-slate-400 mt-1">
                                            {prop.game.awayTeam} @ {prop.game.homeTeam}
                                        </p>
                                    </div>
                                    <span class="px-2 py-1 text-xs font-bold rounded bg-danger/20 text-danger border border-danger/30">
                                        HOT
                                    </span>
                                </div>

                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-xs text-slate-400">{formatPropType(prop.propType)}</div>
                                        <div class="text-lg font-bold text-slate-100">O {prop.line}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-success">{formatOdds(prop.bestOverOdds)}</div>
                                        <div class="text-xs text-slate-400">{prop.bestOverSportsbook}</div>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <p class="text-slate-400 mb-4">No hot props available right now.</p>
                        <a href="/api/test-props" class="text-primary underline font-semibold">Fetch props to get started</a>
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <!-- Not Logged In - CTA -->
        <div class="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-12 text-center">
            <h2 class="text-3xl font-bold text-slate-100 mb-4">Start Paper Trading Today</h2>
            <p class="text-slate-300 text-lg mb-8">
                Practice betting on NFL player props with $10,000 virtual money. No risk, all the fun.
            </p>
            <div class="flex gap-4 justify-center">
                <a href="/register" class="inline-block px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105">
                    Sign Up Free
                </a>
                <a href="/login" class="inline-block px-6 py-3 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg font-semibold hover:bg-slate-600 transition-all">
                    Log In
                </a>
            </div>
        </div>

        <!-- Hot Props for Non-Logged In Users -->
        <div class="mt-12">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-slate-100">Hot Props</h2>
                <p class="text-slate-400 mt-1">Best value bets right now</p>
            </div>

            {#if data.hotProps && data.hotProps.length > 0}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each data.hotProps as prop}
                        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-lg">
                            <div class="flex items-start justify-between mb-4">
                                <div>
                                    <h3 class="text-lg font-bold text-slate-100">{prop.playerName}</h3>
                                    <p class="text-sm text-slate-400 mt-1">
                                        {prop.game.awayTeam} @ {prop.game.homeTeam}
                                    </p>
                                </div>
                                <span class="px-2 py-1 text-xs font-bold rounded bg-danger/20 text-danger border border-danger/30">
                                    HOT
                                </span>
                            </div>

                            <div class="mb-4">
                                <div class="text-sm text-slate-400 mb-1">{formatPropType(prop.propType)}</div>
                                <div class="text-2xl font-bold text-slate-100">Over {prop.line}</div>
                            </div>

                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="text-xs text-slate-500">Best Odds</div>
                                    <div class="text-xl font-bold text-success">{formatOdds(prop.bestOverOdds)}</div>
                                    <div class="text-xs text-slate-400 mt-1">{prop.bestOverSportsbook}</div>
                                </div>
                                <a href="/register" class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold transition-all">
                                    Sign Up
                                </a>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <div class="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <p class="text-slate-400 mb-4">No hot props available right now.</p>
                    <a href="/api/test-props" class="text-primary underline font-semibold">Fetch props to get started</a>
                </div>
            {/if}
        </div>
    {/if}
</div>
