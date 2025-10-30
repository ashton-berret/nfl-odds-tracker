import { json } from '@sveltejs/kit';
import { OddsFetcher } from '$lib/server/api/odds-fetcher';
import { extractAllPlayerProps } from '$lib/server/api/props-parser';
import { savePlayerProps } from '$lib/server/repositories/props-repository';
import { ODDS_API_KEY } from '$env/static/private';

export async function POST() {
    console.log('[API /admin/fetch-odds-props] Fetching Odds API props for all games');

    try {
        const fetcher = new OddsFetcher(ODDS_API_KEY);
        console.log('[API /admin/fetch-odds-props] API Key loaded:', ODDS_API_KEY ? `${ODDS_API_KEY.substring(0, 10)}...` : 'UNDEFINED');

        // Fetch all upcoming games
        const games = await fetcher.fetchUpcomingGames();
        console.log(`[API /admin/fetch-odds-props] Found ${games.length} games`);

        if (games.length === 0) {
            return json({
                success: true,
                gamesProcessed: 0,
                totalPropsSaved: 0,
                message: 'No upcoming games.'
            });
        }

        let gamesProcessed = 0;
        let totalPropsSaved = 0;
        const errors: string[] = [];

        // Process each game
        for (const game of games) {
            try {
                console.log(`[API /admin/fetch-odds-props] Processing: ${game.away_team} @ ${game.home_team}`);

                // Fetch props for this game
                const propsData = await fetcher.fetchPlayerPropsForGames(game.id);

                // Parse props
                const parsedProps = extractAllPlayerProps(propsData);
                console.log(`[API /admin/fetch-odds-props] Parsed ${parsedProps.length} props for game ${game.id}`);

                if (parsedProps.length === 0) {
                    console.log(`[API /admin/fetch-odds-props] No props found for game ${game.id}`);
                    continue;
                }

                // Save to database
                await savePlayerProps(
                    game.id,
                    game.home_team,
                    game.away_team,
                    game.commence_time,
                    parsedProps
                );

                console.log(`[API /admin/fetch-odds-props] ✓ Saved ${parsedProps.length} props for ${game.away_team} @ ${game.home_team}`);

                totalPropsSaved += parsedProps.length;
                gamesProcessed++;

                // Rate limiting - 1 second between games to avoid hitting API limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                const errorMsg = `Failed to process ${game.away_team} @ ${game.home_team}: ${error}`;
                console.error(`[API /admin/fetch-odds-props] ${errorMsg}`);
                errors.push(errorMsg);
                // Continue with next game even if one fails
            }
        }

        console.log(`[API /admin/fetch-odds-props] Complete! Processed ${gamesProcessed}/${games.length} games, saved ${totalPropsSaved} props`);

        return json({
            success: true,
            gamesProcessed,
            totalGames: games.length,
            totalPropsSaved,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[API /admin/fetch-odds-props] Error:', error);
        return json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
