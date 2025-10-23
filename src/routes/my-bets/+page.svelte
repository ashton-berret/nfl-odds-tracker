<script lang="ts">
  export let data;

  $: user = data.user;
  $: bets = data.bets;

  // If no user, don't calculate stats
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

  function getStatusColor(status: string): string {
    switch (status) {
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      case 'push': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  }

  function getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
      <div>
        <a href="/" class="text-blue-600 hover:underline text-sm">← Back to Props</a>
        <h1 class="text-2xl font-bold mt-1">My Bets</h1>
      </div>

      {#if user}
        <div class="text-right">
          <div class="text-sm text-gray-600">Balance</div>
          <div class="text-xl font-bold text-green-600">
            ${user.balance.toFixed(2)}
          </div>
        </div>
      {:else}
        <div>
          <a href="/login" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Login
          </a>
        </div>
      {/if}
    </div>
  </div>

  <div class="max-w-7xl mx-auto p-8">
    <!-- Show login prompt if not authenticated -->
    {#if !user}
      <div class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-2xl font-bold mb-4">Please Log In</div>
        <div class="text-gray-600 mb-6">You need to be logged in to view your bets</div>
        <a href="/login" class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 inline-block">
          Go to Login
        </a>
      </div>
    {:else}
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <!-- Total Bets -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-sm text-gray-600 mb-1">Total Bets</div>
          <div class="text-3xl font-bold">{totalBets}</div>
        </div>

        <!-- Pending -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-sm text-gray-600 mb-1">Pending</div>
          <div class="text-3xl font-bold text-yellow-600">{pendingBets.length}</div>
        </div>

        <!-- Won/Lost -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-sm text-gray-600 mb-1">Won / Lost</div>
          <div class="text-3xl font-bold">
            <span class="text-green-600">{wonBets.length}</span>
            <span class="text-gray-400"> / </span>
            <span class="text-red-600">{lostBets.length}</span>
          </div>
        </div>

        <!-- Total P&L -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="text-sm text-gray-600 mb-1">Total P&L</div>
          <div class="text-3xl font-bold {totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}">
            ${totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Bets Table -->
      {#if bets.length === 0}
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <div class="text-gray-500 mb-4">You haven't placed any bets yet</div>
          <a href="/" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block">
            View Props
          </a>
        </div>
      {:else}
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bet</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Game</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Odds</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Profit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each bets as bet}
                <tr class="hover:bg-gray-50">
                  <!-- Date -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {new Date(bet.placedAt).toLocaleDateString()}
                    </div>
                    <div class="text-xs text-gray-500">
                      {new Date(bet.placedAt).toLocaleTimeString()}
                    </div>
                  </td>

                  <!-- Bet Details -->
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{bet.player}</div>
                    <div class="text-sm text-gray-600">
                      {formatPropType(bet.propType)}
                      <span class="font-semibold uppercase {bet.side === 'over' ? 'text-green-600' : 'text-red-600'}">
                        {bet.side}
                      </span>
                      {bet.line}
                    </div>
                    <div class="text-xs text-gray-500">{bet.sportsbook}</div>
                  </td>

                  <!-- Game -->
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">{bet.game}</div>
                    <div class="text-xs text-gray-500">
                      {new Date(bet.commenceTime).toLocaleDateString()}
                    </div>
                  </td>

                  <!-- Amount -->
                  <td class="px-6 py-4 text-center">
                    <div class="font-semibold">${bet.amount.toFixed(2)}</div>
                  </td>

                  <!-- Odds -->
                  <td class="px-6 py-4 text-center">
                    <div class="font-mono text-sm">{formatOdds(bet.odds)}</div>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(bet.status)}">
                      {getStatusText(bet.status)}
                    </span>
                  </td>

                  <!-- Profit -->
                  <td class="px-6 py-4 text-center">
                    {#if bet.profit !== null && bet.profit !== undefined}
                      <div class="font-semibold {bet.profit >= 0 ? 'text-green-600' : 'text-red-600'}">
                        {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                      </div>
                    {:else}
                      <div class="text-gray-400">-</div>
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
</div>
