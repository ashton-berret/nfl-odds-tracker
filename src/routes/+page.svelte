<script lang="ts">
  export let data;

  // User is now from data, not fetched separately
  $: user = data.user;  // Reactive - updates when data changes

  let showBetSlip = false;
  let selectedProp: any = null;
  let selectedSide: 'over' | 'under' = 'over';
  let selectedSportsbook: any = null;
  let betAmount = 100;
  let placing = false;
  let errorMessage = '';

  // Open bet slip for a prop
  function openBetSlip(prop: any, side: 'over' | 'under') {
    if (!user) {
      alert('Please log in to place bets');
      return;
    }

    selectedProp = prop;
    selectedSide = side;

    // Find the sportsbook with best odds for this side
    const bestBook = prop.allOdds.reduce((best: any, current: any) => {
      const currentOdds = side === 'over' ? current.overOdds : current.underOdds;
      const bestOdds = side === 'over' ? best.overOdds : best.underOdds;
      return currentOdds > bestOdds ? current : best;
    });

    selectedSportsbook = bestBook;
    showBetSlip = true;
    errorMessage = '';
  }

  // Place the bet
  async function placeBet() {
    if (!selectedProp || !selectedSportsbook || !user) return;

    placing = true;
    errorMessage = '';

    try {
      const odds = selectedSide === 'over'
        ? selectedSportsbook.overOdds
        : selectedSportsbook.underOdds;

      // Find the sportsbook ID
      const sportsbookResponse = await fetch(`/api/sportsbooks?name=${encodeURIComponent(selectedSportsbook.sportsbook)}`);
      const sportsbookData = await sportsbookResponse.json();

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
        // Update user balance
        user.balance = result.newBalance;

        // Close bet slip
        showBetSlip = false;
        alert('Bet placed successfully!');

        // Reload page to refresh data
        window.location.reload();
      } else {
        errorMessage = result.error;
      }
    } catch (error) {
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

<div class="min-h-screen bg-gray-50">
  <!-- Header with user info -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
      <h1 class="text-2xl font-bold">NFL Props Betting Simulator</h1>

      {#if user}
        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm text-gray-600">Balance</div>
            <div class="text-xl font-bold text-green-600">
              ${user.balance.toFixed(2)}
            </div>
          </div>
          <div class="text-sm text-gray-600">
            {user.username}
          </div>
          <a href="/my-bets" class="text-blue-600 hover:underline">My Bets</a>
        </div>
      {:else}
        <div class="flex gap-2">
          <a href="/login" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Login
          </a>
          <a href="/register" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            Register
          </a>
        </div>
      {/if}
    </div>
  </div>

  <!-- Props table -->
  <div class="max-w-7xl mx-auto p-8">
    {#if data.props.length === 0}
      <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No props available. Visit <a href="/api/test-props" class="underline">/api/test-props</a> to fetch data.
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
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Over</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Under</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data.props as prop}
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
                    on:click={() => openBetSlip(prop, 'over')}
                    class="bg-green-100 hover:bg-green-200 px-3 py-2 rounded transition"
                  >
                    <div class="font-bold text-green-700">{formatOdds(prop.bestOverOdds)}</div>
                    <div class="text-xs text-gray-600">{prop.bestOverSportsbook}</div>
                  </button>
                </td>
                <td class="px-6 py-4 text-center">
                  <button
                    on:click={() => openBetSlip(prop, 'under')}
                    class="bg-red-100 hover:bg-red-200 px-3 py-2 rounded transition"
                  >
                    <div class="font-bold text-red-700">{formatOdds(prop.bestUnderOdds)}</div>
                    <div class="text-xs text-gray-600">{prop.bestUnderSportsbook}</div>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
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
