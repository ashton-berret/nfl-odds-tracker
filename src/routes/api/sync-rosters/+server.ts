import { json } from '@sveltejs/kit';
import { syncAllNFLRosters } from '$lib/server/api/player-team-sync';

/**
 * POST /api/sync-rosters
 *
 * manually triggers roster sync from espn
 */
export async function POST() {
    console.log('[API /sync rosters] Starting roster sync');

    try {
        const stats = await syncAllNFLRosters();

        return json({
            success: true,
            message: 'Rosters synced successfully',
            stats
        });
    } catch (error) {
        console.error('[API /sync-rosters] Error:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Error'
        }, { status: 500 });
    }
}
