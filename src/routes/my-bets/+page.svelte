<script lang="ts">
    // src/routes/my-bets/+page.svelte
    export let data;

    $: user = data.user;
    $: bets = data.bets;

    // Calculate stats
    $: totalBets = bets.length;
    $: pendingBets = bets.filter((b: any) => b.status === 'pending');
    $: wonBets = bets.filter((b: any) => b.status === 'won');
    $: lostBets = bets.filter((b: any) => b.status === 'lost');
    $: totalWagered = bets.reduce((sum: number, b: any) => sum + b.amount, 0);
    $: totalProfit = bets
        .filter((b: any) => b.profit !== null)
        .reduce((sum: number, b: any) => sum + (b.profit || 0), 0);

    function formatPropType(propType: string): string {
        return propType
            .replace('player_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    function formatOdds(odds: number): string {
        return odds > 0 ? `+${odds}` : odds.toString();
    }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if !user}
        <!-- Not Logged In -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-12 text-center">
            <div class="text-3xl font-bold text-slate-100 mb-4">Please Log In</div>
            <div class="text-slate-400 text-lg mb-8">You need to be logged in to view your bets</div>
            <a href="/login" class="inline-block px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105">
                Go to Login
            </a>
        </div>
    {:else}
        <!-- Header -->
        <div class="mb-8">
            <a href="/" class="text-primary hover:text-primary-light text-sm font-semibold hover:underline">← Back to Dashboard</a>
            <h1 class="text-4xl font-bold text-slate-100 mt-2">My Bets</h1>
            <p class="text-slate-400 mt-1 text-lg">Track your betting history and performance</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <!-- Total Bets -->
            <div class="stat-card border-primary group hover:shadow-glow-sm">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total Bets</div>
                <div class="text-4xl font-bold text-slate-100 group-hover:scale-110 transition-transform">{totalBets}</div>
            </div>

            <!-- Pending -->
            <div class="stat-card border-warning group hover:shadow-glow-md">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Pending</div>
                <div class="text-4xl font-bold text-warning group-hover:scale-110 transition-transform">{pendingBets.length}</div>
            </div>

            <!-- Won/Lost -->
            <div class="stat-card border-purple-500 group hover:shadow-glow-md">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Won / Lost</div>
                <div class="text-4xl font-bold group-hover:scale-110 transition-transform">
                    <span class="text-success">{wonBets.length}</span>
                    <span class="text-slate-600"> / </span>
                    <span class="text-danger">{lostBets.length}</span>
                </div>
            </div>

            <!-- Total P&L -->
            <div class="stat-card {totalProfit >= 0 ? 'border-success' : 'border-danger'} group {totalProfit >= 0 ? 'hover:shadow-glow-success' : 'hover:shadow-glow-danger'}">
                <div class="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Total P&L</div>
                <div class="text-4xl font-bold {totalProfit >= 0 ? 'text-success' : 'text-danger'} group-hover:scale-110 transition-transform">
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                </div>
            </div>
        </div>

        <!-- Bets Table -->
        {#if bets.length === 0}
            <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-12 text-center">
                <div class="text-slate-400 text-lg mb-6">You haven't placed any bets yet</div>
                <a href="/props" class="inline-block px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105">
                    Browse Props
                </a>
            </div>
        {:else}
            <div class="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                <table class="min-w-full">
                    <thead class="bg-slate-900/50 border-b border-slate-700">
                        <tr>
                            <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Date</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Bet</th>
                            <th class="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Game</th>
                            <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">Amount</th>
                            <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">Odds</th>
                            <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-4 text-center text-xs font-bold text-slate-300 uppercase tracking-wider">Profit</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700/50">
                        {#each bets as bet}
                            <tr class="hover:bg-slate-700/30 transition-colors">
                                <!-- Date -->
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-slate-200 font-medium">
                                        {new Date(bet.placedAt).toLocaleDateString()}
                                    </div>
                                    <div class="text-xs text-slate-500">
                                        {new Date(bet.placedAt).toLocaleTimeString()}
                                    </div>
                                </td>

                                <!-- Bet Details -->
                                <td class="px-6 py-4">
                                    <div class="font-semibold text-slate-100 text-lg">{bet.player}</div>
                                    <div class="text-sm text-slate-300 mt-1">
                                        {formatPropType(bet.propType)}
                                        <span class="font-bold uppercase {bet.side === 'over' ? 'text-success' : 'text-danger'}">
                                            {bet.side}
                                        </span>
                                        <span class="text-slate-100">{bet.line}</span>
                                    </div>
                                    <div class="text-xs text-slate-500 mt-1">{bet.sportsbook}</div>
                                </td>

                                <!-- Game -->
                                <td class="px-6 py-4">
                                    <div class="text-sm text-slate-300 font-medium">{bet.game}</div>
                                    <div class="text-xs text-slate-500 mt-1">
                                        {new Date(bet.commenceTime).toLocaleDateString()}
                                    </div>
                                </td>

                                <!-- Amount -->
                                <td class="px-6 py-4 text-center">
                                    <div class="font-bold text-slate-100 text-lg">${bet.amount.toFixed(2)}</div>
                                </td>

                                <!-- Odds -->
                                <td class="px-6 py-4 text-center">
                                    <div class="font-mono font-semibold text-primary">{formatOdds(bet.odds)}</div>
                                </td>

                                <!-- Status -->
                                <td class="px-6 py-4 text-center">
                                    <span class="badge
                                        {bet.status === 'won' ? 'badge-success' :
                                         bet.status === 'lost' ? 'badge-danger' :
                                         bet.status === 'push' ? 'bg-slate-700 text-slate-300 border-slate-600' :
                                         'badge-warning'}">
                                        {bet.status.toUpperCase()}
                                    </span>
                                </td>

                                <!-- Profit -->
                                <td class="px-6 py-4 text-center">
                                    {#if bet.profit !== null && bet.profit !== undefined}
                                        <div class="font-bold text-lg {bet.profit >= 0 ? 'text-success' : 'text-danger'}">
                                            {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                                        </div>
                                    {:else}
                                        <div class="text-slate-600 text-lg">-</div>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    {/if}
</div>
