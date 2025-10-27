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

<div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 max-w-md w-full">
        <h1 class="text-3xl font-bold mb-6 text-center text-slate-100">Welcome Back</h1>

        {#if error}
            <div class="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-4">
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleLogin}>
            <div class="mb-4">
                <label for="emailOrUsername" class="block text-sm font-semibold text-slate-300 mb-2">
                    Email or Username
                </label>
                <input
                    id="emailOrUsername"
                    type="text"
                    bind:value={emailOrUsername}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="Enter your email or username"
                />
            </div>

            <div class="mb-6">
                <label for="password" class="block text-sm font-semibold text-slate-300 mb-2">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="Enter your password"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="w-full bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>

        <div class="text-center text-sm text-slate-400">
            Don't have an account?
            <a href="/register" class="text-primary hover:text-primary-light font-semibold hover:underline">Register</a>
        </div>

        <div class="mt-4 text-center">
            <a href="/" class="text-sm text-slate-400 hover:text-slate-300 hover:underline">← Back to home</a>
        </div>
    </div>
</div>
