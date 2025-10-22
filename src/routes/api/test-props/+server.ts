import { json } from '@sveltejs/kit';
import { OddsFetcher } from '$lib/server/api/odds-fetcher';
import { extractAllPlayerProps } from '$lib/server/api/props-parser';
import { ODDS_API_KEY } from '$env/static/private'


export async function GET() {
    console.log(`[API TESTING] Testing fetching and parsing results from API endpoint`)
    try {
        const fetcher = new OddsFetcher(ODDS_API_KEY);
        console.log('[API TESTING] API Key loaded:', ODDS_API_KEY ? `${ODDS_API_KEY.substring(0, 10)}...` : 'UNDEFINED')
        const games = await fetcher.fetchUpcomingGames();
        console.log(`[API TESTING] Found ${games.length} games`);

        if (games.length === 0) {
            return json({
                success: true,
                gamesCount: 0,
                message: 'No upcoming games.'
            });
        }

        const firstGameId = games[0].id;
        const propsData = await fetcher.fetchPlayerPropsForGames(firstGameId);

        const parsedProps = extractAllPlayerProps(propsData);

        console.log(`[API TESTING] Parsed ${parsedProps.length} player props.`);

        return json({
            success: true,
            game: games[0],
            propsCount: parsedProps.length,
            props: parsedProps
        })

    } catch (error) {
        console.error('[API TESTING] Error:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'}, { status: 500});
    }
}
