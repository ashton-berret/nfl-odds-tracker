<script lang="ts">
  // This 'data' variable is automatically passed from +page.ts
  export let data;

  // Helper function to format prop types nicely
  function formatPropType(propType: string): string {
    return propType
      .replace('player_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    // Example: "player_reception_yds" → "Reception Yds"
  }

  // Helper function to format odds display
  function formatOdds(odds: number): string {
    if (odds > 0) return `+${odds}`;
    return odds.toString();
  }
</script>

<div class="min-h-screen bg-gray-50 p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">NFL Player Props</h1>
      <p class="text-gray-600">
        Comparing odds across sportsbooks | {data.count} props loaded
      </p>
    </div>

    <!-- Error message -->
    {#if data.error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {data.error}
      </div>
    {/if}

    <!-- No props message -->
    {#if data.props.length === 0}
      <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No props found. Try visiting <a href="/api/test-props" class="underline">/api/test-props</a> to fetch some data first.
      </div>
    {:else}
      <!-- Props table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Player
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Game
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Prop Type
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Line
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Best Over
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Best Under
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each data.props as prop}
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {prop.playerName}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {prop.game.awayTeam} @ {prop.game.homeTeam}
                  </div>
                  <div class="text-xs text-gray-500">
                    {new Date(prop.game.commenceTime).toLocaleDateString()}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formatPropType(prop.propType)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="text-sm font-bold text-gray-900">
                    {prop.line}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="text-sm font-bold text-green-600">
                    {formatOdds(prop.bestOverOdds)}
                  </div>
                  <div class="text-xs text-gray-500">
                    {prop.bestOverSportsbook}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <div class="text-sm font-bold text-red-600">
                    {formatOdds(prop.bestUnderOdds)}
                  </div>
                  <div class="text-xs text-gray-500">
                    {prop.bestUnderSportsbook}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>


