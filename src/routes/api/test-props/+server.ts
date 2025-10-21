import { json } from '@sveltejs/kit';
import { OddsFetcher } from '$lib/server/api/odds-fetcher';
import { ODDS_API_KEY } from '$env/static/private'


export async function GET() {
    console.log(`[TESTING] Testing response for API endpoint`)
    try {
        const fetcher = new OddsFetcher(ODDS_API_KEY);
        console.log('[TESTING] API Key loaded:', ODDS_API_KEY ? `${ODDS_API_KEY.substring(0, 10)}...` : 'UNDEFINED')
        const games = await fetcher.fetchUpcomingGames();
        console.log(`[TESTING] Found ${games.length} games`);

        if (games.length > 0) {
            const firstGameId = games[0].id;
            console.log(`[TESTING] Fetching props for first game`)

            const props = await fetcher.fetchPlayerPropsForGames(firstGameId);

            return json({
                success: true,
                gamesCount: games.length,
                sampleGame: games[0],
                sampleProps: props
            });
        }

        return json({
            success: true,
            gamesCount: 0,
            message: 'No upcoming games.'
        });
    } catch (error) {
        console.error('[TESTING] Error:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'}, { status: 500});
    }
}
