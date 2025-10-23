import { redirect } from '@sveltejs/kit';

/**
 * load user bets, redirecting to login if not authenticated
 */
export async function load({ fetch }) {
    console.log('[MY BETS] Loading bets');

    try {
        const userResponse = await fetch('/api/auth/me');
        const userData = await userResponse.json();

        const betsResponse = await fetch('/api/bets/my-bets');
        const betsData = await betsResponse.json();

        return {
            user: userData.user,
            bets: betsData.bets || []
        };
    } catch (error) {
        console.error('[MY BETS] Error:', error);
        return {
            user: null,
            bets: [],
            error: 'Failed to load bets'
        };
    }
}
