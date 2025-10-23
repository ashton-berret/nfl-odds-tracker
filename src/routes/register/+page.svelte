<script lang="ts">
  let email = '';
  let username = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let loading = false;

  async function handleRegister() {
    error = '';

    // Validation
    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to homepage
        window.location.href = '/';
      } else {
        error = result.error;
      }
    } catch (err) {
      error = 'Registration failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
    <h1 class="text-3xl font-bold mb-6 text-center">Register</h1>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleRegister}>
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium mb-2">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="your@email.com"
        />
      </div>

      <div class="mb-4">
        <label for="username" class="block text-sm font-medium mb-2">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="Choose a username"
        />
      </div>

      <div class="mb-4">
        <label for="password" class="block text-sm font-medium mb-2">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="At least 6 characters"
        />
      </div>

      <div class="mb-6">
        <label for="confirmPassword" class="block text-sm font-medium mb-2">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          bind:value={confirmPassword}
          required
          class="w-full border rounded px-3 py-2"
          placeholder="Re-enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>

    <div class="text-center text-sm">
      <p class="text-gray-600 mb-2">
        Already have an account?
        <a href="/login" class="text-blue-600 hover:underline">Login</a>
      </p>
      <a href="/" class="text-gray-600 hover:underline">← Back to home</a>
    </div>
  </div>
</div>
