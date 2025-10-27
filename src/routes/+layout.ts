/**
 * layout load function that runs before every page and loads all user session data that all pages need
 */
export async function load({ fetch }) {
    console.log('[LAYOUT LOAD] Fetching user session...');

    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        console.log('[LAYOUT LOAD] User loaded:', data.user ? data.user.username : 'Not logged in');

        return {
            user: data.user || null
        };
    } catch (error) {
        console.error('[LAYOUT LOAD] Error fetching user:', error);
        return {
            user: null
        };
    }
}
