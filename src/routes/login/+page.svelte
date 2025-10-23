<script lang="ts">
  let emailOrUsername = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password })
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to homepage
        window.location.href = '/';
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
    <h1 class="text-3xl font-bold mb-6 text-center">Login</h1>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div class="mb-4">
        <label for="emailOrUsername" class="block text-sm font-medium mb-2">Email or Username</label>
        <input
          id="emailOrUsername"
          type="text"
          bind:value={emailOrUsername}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="Enter your email or username"
        />
      </div>

      <div class="mb-6">
        <label for="password" class="block text-sm font-medium mb-2">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>

    <div class="text-center text-sm text-gray-600">
      Don't have an account?
      <a href="/register" class="text-blue-600 hover:underline">Register</a>
    </div>

    <div class="mt-4 text-center">
      <a href="/" class="text-sm text-gray-600 hover:underline">← Back to home</a>
    </div>
  </div>
</div>
