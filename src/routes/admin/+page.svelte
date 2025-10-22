<script lang="ts">
  let syncing = false;
  let result = '';

  async function syncRosters() {
    syncing = true;
    result = 'Syncing...';

    try {
      const response = await fetch('/api/sync-rosters', { method: 'POST' });
      const data = await response.json();
      result = JSON.stringify(data, null, 2);
    } catch (error) {
      result = `Error: ${error}`;
    } finally {
      syncing = false;
    }
  }
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Admin Panel</h1>

  <button
    on:click={syncRosters}
    disabled={syncing}
    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
  >
    {syncing ? 'Syncing...' : 'Sync NFL Rosters from ESPN'}
  </button>

  {#if result}
    <pre class="mt-4 p-4 bg-gray-100 rounded overflow-auto">{result}</pre>
  {/if}
</div>
