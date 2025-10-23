<script lang="ts">
    import "../app.css";
    import { page } from '$app/stores';

    // User comes from +layout.ts now (no more onMount fetching)
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

<div class="min-h-screen bg-gray-50">
    <!-- Navigation Bar -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
                <!-- Left: Logo & Main Nav -->
                <div class="flex">
                    <!-- Logo -->
                    <a href="/" class="flex items-center px-2 text-xl font-bold text-gray-900">
                        <span class="text-2xl mr-2">🏈</span>
                        PropBet Sim
                    </a>

                    <!-- Main Navigation Links -->
                    <div class="hidden sm:ml-6 sm:flex sm:space-x-4">
                        <a href="/"
                            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                            {isActive('/') && currentPath === '/'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            Dashboard
                        </a>

                        <a href="/props"
                            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                            {isActive('/props')
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            Props
                        </a>

                        <a href="/models"
                            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                            {isActive('/models')
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            Models
                            <span class="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Pro</span>
                        </a>

                        <a href="/my-bets"
                            class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                            {isActive('/my-bets')
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            My Bets
                        </a>
                    </div>
                </div>

                <!-- Right: User Info / Auth Buttons -->
                <div class="flex items-center">
                    {#if user}
                        <!-- User Balance -->
                        <div class="hidden sm:block mr-4 text-right">
                            <div class="text-xs text-gray-500">Balance</div>
                            <div class="text-sm font-bold text-green-600">
                                ${user.balance.toFixed(2)}
                            </div>
                        </div>

                        <!-- User Menu Dropdown -->
                        <div class="relative user-menu">
                            <button
                                on:click={() => showUserMenu = !showUserMenu}
                                class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span class="hidden sm:inline">{user.username}</span>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {#if showUserMenu}
                                <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                    <a href="/profile"
                                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Profile & Settings
                                    </a>
                                    <button
                                        on:click={handleLogout}
                                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Logout
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <!-- Login/Register Buttons -->
                        <div class="flex items-center space-x-2">
                            <a href="/login"
                                class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Login
                            </a>
                            <a href="/register"
                                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
