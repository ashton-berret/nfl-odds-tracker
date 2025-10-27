<script lang="ts">
    import "../app.css";
    import { page } from '$app/stores';

    // User comes from +layout.ts now
    export let data: {
        user: {
            id: number;
            username: string;
            email: string;
            balance: number;
        } | null;
    };

    $: user = data.user;

    let showUserMenu = false;

    async function handleLogout() {
        console.log('[LAYOUT] Logging out...');
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('[LAYOUT] Logout failed:', error);
        }
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-menu')) {
            showUserMenu = false;
        }
    }

    $: currentPath = $page.url.pathname;

    function isActive(path: string): boolean {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="min-h-screen bg-slate-900">
    <!-- Navigation Bar -->
    <nav class="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <!-- Left: Logo & Main Nav -->
                <div class="flex">
                    <!-- Logo -->
                    <a href="/" class="flex items-center px-2 text-xl font-bold text-slate-100 hover:text-white transition-colors group">
                        <span class="text-2xl mr-2 group-hover:scale-110 transition-transform">🏈</span>
                        <span class="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                            PropBet Sim
                        </span>
                    </a>

                    <!-- Main Navigation Links -->
                    <div class="hidden sm:ml-6 sm:flex sm:space-x-2">
                        <a href="/"
                            class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all
                            {currentPath === '/'
                                ? 'bg-primary/20 text-primary shadow-glow-sm'
                                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'}"
                        >
                            Dashboard
                        </a>

                        <a href="/props"
                            class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all
                            {currentPath.startsWith('/props')
                                ? 'bg-primary/20 text-primary shadow-glow-sm'
                                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'}"
                        >
                            Props
                        </a>

                        <a href="/models"
                            class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all
                            {currentPath.startsWith('/models')
                                ? 'bg-primary/20 text-primary shadow-glow-sm'
                                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'}"
                        >
                            Models
                            <span class="ml-2 px-2 py-0.5 text-xs bg-warning/20 text-warning border border-warning/30 rounded-full">
                                Pro
                            </span>
                        </a>

                        <a href="/my-bets"
                            class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all
                            {currentPath.startsWith('/my-bets')
                                ? 'bg-primary/20 text-primary shadow-glow-sm'
                                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'}"
                        >
                            My Bets
                        </a>
                    </div>
                </div>

                <!-- Right: User Info / Auth Buttons -->
                <div class="flex items-center">
                    {#if user}
                        <!-- User Balance -->
                        <div class="hidden sm:block mr-6 text-right">
                            <div class="text-xs text-slate-400 font-medium">Balance</div>
                            <div class="text-lg font-bold text-success">
                                ${user.balance.toFixed(2)}
                            </div>
                        </div>

                        <!-- User Menu Dropdown -->
                        <div class="relative user-menu">
                            <button
                                on:click={() => showUserMenu = !showUserMenu}
                                class="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-100 hover:bg-slate-700/50 transition-all"
                            >
                                <div class="w-9 h-9 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span class="hidden sm:inline font-semibold">{user.username}</span>
                                <svg class="w-4 h-4 transition-transform {showUserMenu ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {#if showUserMenu}
                                <div class="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-2xl py-2 z-50 border border-slate-700">
                                    <div class="px-4 py-3 border-b border-slate-700">
                                        <p class="text-sm text-slate-400">Signed in as</p>
                                        <p class="text-sm font-semibold text-slate-100 truncate">{user.email}</p>
                                    </div>
                                    <a href="/profile"
                                        class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                                    >
                                        Profile & Settings
                                    </a>
                                    <button
                                        on:click={handleLogout}
                                        class="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-slate-700/50 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <!-- Login/Register Buttons -->
                        <div class="flex items-center space-x-3">
                            <a href="/login"
                                class="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
                            >
                                Login
                            </a>
                            <a href="/register"
                                class="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-primary to-blue-600 rounded-lg hover:shadow-glow-md transition-all hover:scale-105"
                            >
                                Sign Up
                            </a>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </nav>

    <!-- Page Content -->
    <main>
        <slot />
    </main>
</div>
