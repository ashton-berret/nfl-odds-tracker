import { prisma } from '$lib/server/db';

/**
 * Props page load function - loads both Odds API and DraftKings data
 */
export async function load() {
    console.log('[PROPS PAGE LOAD] Loading props from both sources');

    try {
        // Load Odds API props (main lines, multiple sportsbooks)
        const oddsApiProps = await prisma.playerProp.findMany({
            where: {
                source: 'theoddsapi'
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
            orderBy: [
                { game: { commenceTime: 'asc' } },
                { player: { name: 'asc' } }
            ],
            take: 100
        });

        // Load DraftKings props (alt lines, single sportsbook)
        const dkProps = await prisma.playerProp.findMany({
            where: {
                source: 'draftkings'
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
                        source: 'draftkings'
                    },
                    include: {
                        sportsbook: true
                    },
                    orderBy: {
                        fetchedAt: 'desc'
                    },
                    take: 1  // Latest odds only
                }
            },
            orderBy: [
                { game: { commenceTime: 'asc' } },
                { player: { name: 'asc' } },
                { line: 'asc' }  // Sort alt lines by value
            ]
        });

        // Group DK props by player for easier display
        const dkPropsByPlayer = groupDKPropsByPlayer(dkProps);

        // Process Odds API props to get latest odds per sportsbook
        const processedOddsApiProps = processOddsApiProps(oddsApiProps);

        console.log(`[PROPS PAGE LOAD] Loaded ${processedOddsApiProps.length} Odds API props`);
        console.log(`[PROPS PAGE LOAD] Loaded ${dkPropsByPlayer.length} DK player groups`);

        return {
            oddsApiProps: processedOddsApiProps,
            dkProps: dkPropsByPlayer
        };

    } catch (error) {
        console.error('[PROPS PAGE LOAD] Error:', error);
        return {
            oddsApiProps: [],
            dkProps: [],
            error: 'Failed to load props'
        };
    }
}

/**
 * Group DK props by player and prop type
 */
function groupDKPropsByPlayer(props: any[]) {
    const grouped = new Map();

    for (const prop of props) {
        const key = `${prop.player.id}|${prop.propType}|${prop.game.id}`;

        if (!grouped.has(key)) {
            grouped.set(key, {
                playerId: prop.player.id,
                playerName: prop.player.name,
                playerTeam: prop.player.team.name,
                game: {
                    id: prop.game.id,
                    homeTeam: prop.game.homeTeam.name,
                    awayTeam: prop.game.awayTeam.name,
                    commenceTime: prop.game.commenceTime
                },
                propType: prop.propType,
                lines: []
            });
        }

        grouped.get(key).lines.push({
            id: prop.id,
            line: prop.line,
            odds: prop.propOdds[0] || null
        });
    }

    return Array.from(grouped.values());
}

/**
 * Process Odds API props to get best odds
 */
function processOddsApiProps(props: any[]) {
    const processed = [];

    for (const prop of props) {
        // Get latest odds per sportsbook (dedupe by sportsbook)
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
        let bestUnderOdds = null;
        let bestUnderSportsbook = null;

        for (const odds of allOdds) {
            if (odds.overOdds !== null && (bestOverOdds === null || odds.overOdds > bestOverOdds)) {
                bestOverOdds = odds.overOdds;
                bestOverSportsbook = odds.sportsbook.name;
            }
            if (odds.underOdds !== null && (bestUnderOdds === null || odds.underOdds > bestUnderOdds)) {
                bestUnderOdds = odds.underOdds;
                bestUnderSportsbook = odds.sportsbook.name;
            }
        }

        processed.push({
            id: prop.id,
            playerName: prop.player.name,
            playerTeam: prop.player.team.name,
            game: {
                id: prop.game.id,
                homeTeam: prop.game.homeTeam.name,
                awayTeam: prop.game.awayTeam.name,
                commenceTime: prop.game.commenceTime
            },
            propType: prop.propType,
            line: prop.line,
            bestOverOdds,
            bestOverSportsbook,
            bestUnderOdds,
            bestUnderSportsbook,
            allOdds: allOdds.map(odds => ({
                sportsbook: odds.sportsbook.name,
                overOdds: odds.overOdds,
                underOdds: odds.underOdds,
                sportsbookId: odds.sportsbook.id
            }))
        });
    }

    return processed;
}
