import { prisma } from '$lib/server/db';

/**
 * Dashboard page - shows overview and hot props
 */
export async function load({ locals }) {
    console.log('[DASHBOARD LOAD] Loading dashboard data');
    console.log('[DASHBOARD LOAD] User from locals:', locals.user);

    try {
        const userId = locals.user?.id;
        console.log('[DASHBOARD LOAD] User ID:', userId);

        // Get user's recent bets if logged in
        let recentBets = [];
        let userStats = null;

        if (userId) {
            console.log('[DASHBOARD LOAD] User is logged in, fetching bets...');
            recentBets = await prisma.bet.findMany({
                where: { userId },
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
                },
                take: 5
            });

            // Calculate user stats
            const allBets = await prisma.bet.findMany({
                where: { userId }
            });

            const wonBets = allBets.filter(b => b.status === 'won').length;
            const lostBets = allBets.filter(b => b.status === 'lost').length;
            const pendingBets = allBets.filter(b => b.status === 'pending').length;

            const totalProfit = allBets.reduce((sum, bet) => {
                if (bet.status === 'won') {
                    return sum + (bet.payout - bet.amount);
                } else if (bet.status === 'lost') {
                    return sum - bet.amount;
                }
                return sum;
            }, 0);

            userStats = {
                totalBets: allBets.length,
                wonBets,
                lostBets,
                pendingBets,
                winRate: allBets.length > 0 ? ((wonBets / (wonBets + lostBets)) * 100).toFixed(1) : '0.0',
                totalProfit
            };

            console.log('[DASHBOARD LOAD] User stats:', userStats);
        } else {
            console.log('[DASHBOARD LOAD] User is NOT logged in');
        }

        // Get "hot props" - props with best odds value (highest over odds)
        const hotProps = await prisma.playerProp.findMany({
            where: {
                source: 'theoddsapi',
                game: {
                    commenceTime: {
                        gte: new Date() // Only upcoming games
                    }
                }
            },
            include: {
                player: {
                    include: {
                        team: true
                    }
                },
                game: {
                    include: {
                        homeTeam: true,
                        awayTeam: true
                    }
                },
                propOdds: {
                    where: {
                        source: 'theoddsapi'
                    },
                    include: {
                        sportsbook: true
                    },
                    orderBy: {
                        fetchedAt: 'desc'
                    }
                }
            },
            take: 50 // Get a decent sample
        });

        // Process and find props with best odds
        const processedHotProps = hotProps
            .map(prop => {
                // Get latest odds per sportsbook
                const latestOddsBySportsbook = new Map();

                for (const odds of prop.propOdds) {
                    const key = odds.sportsbook.id;
                    if (!latestOddsBySportsbook.has(key) ||
                        new Date(odds.fetchedAt) > new Date(latestOddsBySportsbook.get(key).fetchedAt)) {
                        latestOddsBySportsbook.set(key, odds);
                    }
                }

                const allOdds = Array.from(latestOddsBySportsbook.values());

                // Find best odds
                let bestOverOdds = null;
                let bestOverSportsbook = null;

                for (const odds of allOdds) {
                    if (odds.overOdds !== null && (bestOverOdds === null || odds.overOdds > bestOverOdds)) {
                        bestOverOdds = odds.overOdds;
                        bestOverSportsbook = odds.sportsbook.name;
                    }
                }

                return {
                    id: prop.id,
                    playerName: prop.player.name,
                    game: {
                        homeTeam: prop.game.homeTeam.name,
                        awayTeam: prop.game.awayTeam.name,
                        commenceTime: prop.game.commenceTime
                    },
                    propType: prop.propType,
                    line: prop.line,
                    bestOverOdds,
                    bestOverSportsbook
                };
            })
            .filter(prop => prop.bestOverOdds !== null && prop.bestOverOdds > 150) // Only props with good value (underdog lines)
            .sort((a, b) => (b.bestOverOdds || 0) - (a.bestOverOdds || 0)) // Sort by highest odds
            .slice(0, 6); // Top 6

        console.log(`[DASHBOARD LOAD] Loaded ${recentBets.length} recent bets, ${processedHotProps.length} hot props`);

        return {
            recentBets,
            userStats,
            hotProps: processedHotProps
        };

    } catch (error) {
        console.error('[DASHBOARD LOAD] Error:', error);
        return {
            recentBets: [],
            userStats: null,
            hotProps: []
        };
    }
}
