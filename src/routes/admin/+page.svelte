<script lang="ts">
    let syncing = false;
    let syncResult = '';

    let settling = false;
    let settlementResult: any = null;
    let settlementError = '';

    async function syncRosters() {
        syncing = true;
        syncResult = 'Syncing...';
        try {
            const response = await fetch('/api/sync-rosters', { method: 'POST' });
            const data = await response.json();
            syncResult = JSON.stringify(data, null, 2);
        } catch (error) {
            syncResult = `Error: ${error}`;
        } finally {
            syncing = false;
        }
    }

    async function settleBets() {
        settling = true;
        settlementError = '';
        settlementResult = null;

        try {
            console.log('[Admin] Triggering bet settlement...');
            const response = await fetch('/api/admin/settle-games', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                settlementResult = data;
                console.log('[Admin] Settlement result:', data);

                // reload page after 2 sec to show updated balances
                if (data.betsSettled > 0) {
                    setTimeout(() => { window.location.reload(); }, 2000);
                }
            } else {
                settlementError = data.error || 'Settlement failed';
                console.error('[Admin] Settlement error:', data);
            }
        } catch (err) {
            settlementError = 'Network error: ' + err;
            console.error('[Admin] Network error:', err);
        } finally {
            settling = false;
        }
    }
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-4xl font-bold text-slate-100 mb-8">Admin Panel</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Bet Settlement Section -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 class="text-2xl font-bold text-slate-100 mb-4">🎲 Bet Settlement</h2>
            <p class="text-slate-400 mb-6">
                Settle all bets for completed games (games that started more than 4 hours ago).
            </p>

            <button
                on:click={settleBets}
                disabled={settling}
                class="w-full px-6 py-3 bg-gradient-to-r from-success to-success-dark text-white rounded-lg font-bold hover:shadow-glow-success transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {settling ? 'Settling Bets...' : 'Settle Completed Games'}
            </button>

            {#if settlementError}
                <div class="mt-4 p-4 bg-danger/10 border border-danger/30 text-danger rounded-lg">
                    <strong>Error:</strong> {settlementError}
                </div>
            {/if}

            {#if settlementResult}
                <div class="mt-6 p-6 bg-slate-900 border border-slate-700 rounded-lg">
                    <h3 class="text-lg font-bold text-success mb-4">✓ Settlement Complete!</h3>

                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div class="text-slate-400 text-sm mb-1">Games Settled</div>
                            <div class="text-3xl font-bold text-slate-100">{settlementResult.gamesSettled}</div>
                        </div>
                        <div class="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <div class="text-slate-400 text-sm mb-1">Bets Settled</div>
                            <div class="text-3xl font-bold text-slate-100">{settlementResult.betsSettled}</div>
                        </div>
                    </div>

                    {#if settlementResult.results && settlementResult.results.length > 0}
                        <div class="border-t border-slate-700 pt-4">
                            <h4 class="text-sm font-bold text-slate-300 mb-3">Settlement Details:</h4>
                            <div class="space-y-2 max-h-96 overflow-y-auto">
                                {#each settlementResult.results as settlement}
                                    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="font-bold text-slate-100">{settlement.playerName}</span>
                                            <span class="badge text-xs {settlement.status === 'won' ? 'badge-success' : settlement.status === 'lost' ? 'badge-danger' : 'bg-slate-700 text-slate-300 border-slate-600'}">
                                                {settlement.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div class="text-sm text-slate-400">
                                            Line: <span class="text-slate-300 font-semibold">{settlement.line}</span> |
                                            Actual: <span class="text-slate-300 font-semibold">{settlement.actualValue}</span>
                                        </div>
                                        <div class="text-sm text-slate-400 mt-1">
                                            Profit: <span class="{settlement.profit >= 0 ? 'text-success' : 'text-danger'} font-bold">
                                                {settlement.profit >= 0 ? '+' : ''}${settlement.profit.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div class="text-slate-400 text-sm mt-4">
                            No bets were settled. Either no games have completed or all bets were already settled.
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Roster Sync Section -->
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 class="text-2xl font-bold text-slate-100 mb-4">🏈 Roster Sync</h2>
            <p class="text-slate-400 mb-6">
                Sync NFL player rosters from ESPN API. This updates the PlayerTeamMapping table.
            </p>

            <button
                on:click={syncRosters}
                disabled={syncing}
                class="w-full px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {syncing ? 'Syncing...' : 'Sync NFL Rosters from ESPN'}
            </button>

            {#if syncResult}
                <div class="mt-6 p-4 bg-slate-900 border border-slate-700 rounded-lg overflow-auto max-h-96">
                    <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap">{syncResult}</pre>
                </div>
            {/if}
        </div>
    </div>

    <!-- Instructions -->
    <div class="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 class="text-lg font-bold text-slate-100 mb-3">ℹ️ Admin Instructions</h3>
        <ul class="text-slate-400 space-y-2 text-sm">
            <li><strong class="text-slate-300">Bet Settlement:</strong> Automatically fetches game results from ESPN and settles all pending bets for completed games.</li>
            <li><strong class="text-slate-300">Roster Sync:</strong> Updates player-team mappings from ESPN. Run this when rosters change (trades, injuries, new season).</li>
            <li><strong class="text-slate-300">Console Logs:</strong> Check your browser console (F12) for detailed logs during operations.</li>
        </ul>
    </div>
</div>
