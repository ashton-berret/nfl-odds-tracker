<script lang="ts">
    let email = '';
    let username = '';
    let password = '';
    let confirmPassword = '';
    let startingBalance = 1000;
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
                body: JSON.stringify({ email, username, password, startingBalance })
            });

            const result = await response.json();

            if (result.success) {
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

<div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 max-w-md w-full">
        <h1 class="text-3xl font-bold mb-6 text-center text-slate-100">Create Account</h1>

        {#if error}
            <div class="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-4">
                {error}
            </div>
        {/if}

        <form on:submit|preventDefault={handleRegister}>
            <div class="mb-4">
                <label for="email" class="block text-sm font-semibold text-slate-300 mb-2">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="your@email.com"
                />
            </div>

            <div class="mb-4">
                <label for="username" class="block text-sm font-semibold text-slate-300 mb-2">
                    Username
                </label>
                <input
                    id="username"
                    type="text"
                    bind:value={username}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="Choose a username"
                />
            </div>

            <div class="mb-4">
                <label for="password" class="block text-sm font-semibold text-slate-300 mb-2">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="At least 6 characters"
                />
            </div>

            <div class="mb-4">
                <label for="confirmPassword" class="block text-sm font-semibold text-slate-300 mb-2">
                    Confirm Password
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    bind:value={confirmPassword}
                    required
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-500"
                    placeholder="Re-enter your password"
                />
            </div>

            <div class="mb-6">
                <label for="startingBalance" class="block text-sm font-semibold text-slate-300 mb-2">
                    Starting Balance ($)
                </label>
                <select
                    id="startingBalance"
                    bind:value={startingBalance}
                    class="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    <option value={100}>$100</option>
                    <option value={500}>$500</option>
                    <option value={1000}>$1,000</option>
                    <option value={10000}>$10,000</option>
                    <option value={100000}>$100,000</option>
                    <option value={1000000}>$1,000,000 </option>
                </select>
                <p class="text-xs text-slate-500 mt-2">Choose your paper money starting amount</p>
            </div>

            <button
                type="submit"
                disabled={loading}
                class="w-full bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:shadow-glow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
                {loading ? 'Creating account...' : 'Create Account'}
            </button>
        </form>

        <div class="text-center text-sm">
            <p class="text-slate-400 mb-2">
                Already have an account?
                <a href="/login" class="text-primary hover:text-primary-light font-semibold hover:underline">Login</a>
            </p>
            <a href="/" class="text-slate-400 hover:text-slate-300 hover:underline">← Back to home</a>
        </div>
    </div>
</div>
