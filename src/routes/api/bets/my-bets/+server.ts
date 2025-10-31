// src/routes/api/my-bets/+server.ts
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { validateSession } from '$lib/server/auth/session';

/**
 * GET /api/bets/my-bets
 */
export async function GET({ cookies }) {
    const sessionId = cookies.get('session');

    if (!sessionId) {
        return json({ bets: [] });
    }

    const user = await validateSession(sessionId);
    if (!user) {
        return json({ bets: [] });
    }

    // get all bets for the user
    const bets = await prisma.bet.findMany({
        where: { userId: user.id },
        include: {
            prop: {
                include: {
                    player: true,
                    game: {
                        include: {
                            homeTeam: true,
                            awayTeam: true
                        }
                    }
                }
            },
            sportsbook: true
        },
        orderBy: {
            placedAt: 'desc'
        }
    });

    // format
    const formattedBets = bets.map(bet => ({
        id: bet.id,
        amount: bet.amount,
        odds: bet.odds,
        side: bet.side,
        status: bet.status,
        profit: bet.profit,
        placedAt: bet.placedAt,
        settledAt:bet.settledAt,
        player: bet.prop.player.name,
        propType: bet.prop.propType,
        line: bet.prop.line,
        game: `${bet.prop.game.awayTeam.name} @ ${bet.prop.game.homeTeam.name}`,
        commenceTime: bet.prop.game.commenceTime,
        sportsbook: bet.sportsbook.name
    }));

    return json({ bets: formattedBets });
}
