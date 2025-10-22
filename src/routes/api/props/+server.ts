// api endpoint to read from database

import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';


/**
 * GET /api/props
 * Fetch all player props from database with latest odds
 */
export async function GET() {
    console.log('[API /props] Fecthing props from database');

    try {
        const props = await prisma.playerProp.findMany({
            include: {
                player: true,
                game: {
                    include: {
                        homeTeam: true,
                        awayTeam: true
                    }
                },
                propOdds: {
                    include: {
                        sportsbook: true
                    },
                    orderBy: {
                        fetchedAt: 'desc'
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[API /props] Found ${props.length} props in database`);

        // transform data into better format for frontend
        const formattedProps = props.map(prop => {
            // group odds by sportsbook, just keeping the latest
            const latestOddsBySportsbook = new Map();

            for (const odds of prop.propOdds) {
                const key = odds.sportsbook.name;
                if (!latestOddsBySportsbook.has(key)) {
                    latestOddsBySportsbook.set(key, odds);
                }
            }

            const allOdds = Array.from(latestOddsBySportsbook.values());

            // find best odds
            let bestOverOdds = 0;
            let bestOverSportsbook = 'N/A';
            let bestUnderOdds = 0;
            let bestUnderSportsbook = 'N/A';

            // Only process if we have at least one odds entry
            if (allOdds.length > 0) {
                bestOverOdds = allOdds[0].overOdds;
                bestOverSportsbook = allOdds[0].sportsbook.name;
                bestUnderOdds = allOdds[0].underOdds;
                bestUnderSportsbook = allOdds[0].sportsbook.name;

                // Find the actual best odds
                for (const odds of allOdds) {
                    if (odds.overOdds > bestOverOdds) {
                        bestOverOdds = odds.overOdds;
                        bestOverSportsbook = odds.sportsbook.name;
                    }
                    if (odds.underOdds > bestUnderOdds) {
                        bestUnderOdds = odds.underOdds;
                        bestUnderSportsbook = odds.sportsbook.name;
                    }
                }
            } else {
                // Log which prop has no odds (for debugging)
                console.log(`[API /props] Warning: No odds found for ${prop.player.name} - ${prop.propType}`);
            }

            return {
                id: prop.id,
                playerName: prop.player.name,
                propType: prop.propType,
                line: prop.line,
                game: {
                    homeTeam: prop.game.homeTeam.name,
                    awayTeam: prop.game.awayTeam.name,
                    commenceTime: prop.game.commenceTime
                },
                bestOverOdds,
                bestOverSportsbook,
                bestUnderOdds,
                bestUnderSportsbook,
                allOdds: allOdds.map(odds => ({
                    sportsbook: odds.sportsbook.name,
                    overOdds: odds.overOdds,
                    underOdds: odds.underOdds,
                    fetchedAt: odds.fetchedAt
                }))
            };
        });

        return json({
            success: true,
            count: formattedProps.length,
            props: formattedProps
        });
    } catch (error) {
        console.error('[API /props] Error: ', error);
        return json({
            success:false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status : 500 });
    }
}
