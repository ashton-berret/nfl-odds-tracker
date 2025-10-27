import { json } from '@sveltejs/kit';
import { BetSettlementService } from '$lib/server/services/bet-settlement';

/**
 * POST /api/admin/settle-games
 * trigger settlement for all games
 */
export async function POST({ cookies }) {
    console.log('[API /admin/settle-games] Triggering settlement...');

    // add admin auth
    const sessionToken = cookies.get('session');
    if (!sessionToken) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const settlementService = new BetSettlementService();
        const results = await settlementService.settleCompletedGames();

        return json({
            success: true,
            ...results
        });
    } catch (error) {
        console.error('[API /admin/settle-games] Error: ', error);
        return json({
            error: 'Settlement failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
