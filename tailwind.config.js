/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Montserrat', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Custom slate palette for dark mode
                slate: {
                    950: '#020617',  // Darkest (for deep backgrounds)
                    900: '#0f172a',  // Primary background
                    800: '#1e293b',  // Secondary (cards)
                    700: '#334155',  // Tertiary (hover)
                    600: '#475569',  // Borders
                    500: '#64748b',  // Muted elements
                    400: '#94a3b8',  // Tertiary text
                    300: '#cbd5e1',  // Secondary text
                    200: '#e2e8f0',  // Light text
                    100: '#f1f5f9',  // Primary text
                },
                // Accent colors
                primary: {
                    DEFAULT: '#3b82f6',  // Blue-500
                    hover: '#2563eb',     // Blue-600
                    light: '#60a5fa',     // Blue-400
                },
                success: {
                    DEFAULT: '#10b981',   // Green-500
                    light: '#34d399',     // Green-400
                    dark: '#059669',      // Green-600
                },
                danger: {
                    DEFAULT: '#ef4444',   // Red-500
                    light: '#f87171',     // Red-400
                    dark: '#dc2626',      // Red-600
                },
                warning: {
                    DEFAULT: '#f59e0b',   // Yellow-500
                    light: '#fbbf24',     // Yellow-400
                    dark: '#d97706',      // Yellow-600
                },
            },
            boxShadow: {
                'glow-sm': '0 0 10px rgba(59, 130, 246, 0.3)',
                'glow-md': '0 0 20px rgba(59, 130, 246, 0.4)',
                'glow-success': '0 0 15px rgba(16, 185, 129, 0.4)',
                'glow-danger': '0 0 15px rgba(239, 68, 68, 0.4)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
}
