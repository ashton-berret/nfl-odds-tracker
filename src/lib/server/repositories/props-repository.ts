// src/lib/server/repositories/props-repository.ts

import { prisma } from '$lib/server/db';
import type { ParsedPlayerProp } from '$lib/server/api/props-parser';
import type { ParsedDKPlayerProp } from '$lib/server/api/draftkings-parser';

/**
 * Save parsed player props to the database
 */
export async function savePlayerProps(gameExternalId: string, homeTeam: string, awayTeam: string, commenceTime: string, parsedProps: ParsedPlayerProp[]): Promise<void> {
    console.log(`[PROPS REPO] Saving ${parsedProps.length} props for game ${gameExternalId}`);

    try {
        // create or update the home team
        const homeTeamRecord = await prisma.team.upsert({
            where: { name: homeTeam },
            update: {},
            create: {
                name: homeTeam,
                abbreviation: homeTeam.split(' ').pop() || homeTeam
            }
        });
        console.log(`[PROPS REPO] Home team: ${homeTeamRecord.name} (ID: ${homeTeamRecord.id})`);

        // create or update the away team
        const awayTeamRecord = await prisma.team.upsert({
            where: { name: awayTeam },
            update: {},
            create: {
                name: awayTeam,
                abbreviation: awayTeam.split(' ').pop() || awayTeam
            }
        });
        console.log(`[PROPS REPO] Away team: ${awayTeamRecord.name} (ID: ${awayTeamRecord.id})`);

        // create or update the game
        console.log(`[PROPS REPO] Game: ${gameRecord.id}`);

        // find existing game by matchup (teams + time) or create a new one
        let gameRecord = await prisma.game.findFirst({
            where: {
                homeTeamId: homeTeamRecord.id,
                awayTeamId: awayTeamRecord.id,
                commenceTime: {
                    gte: new Date(new Date(commenceTime).getTime() - 60 * 60 * 1000), // within 1 hour
                    lte: new Date(new Date(commenceTime).getTime() + 60 * 60 * 1000)
                }
            }
        });

        if (!gameRecord) {
            gameRecord = await prisma.game.create({
                data: {
                    externalId: gameExternalId,
                    homeTeamId: homeTeamRecord.id,
                    awayTeamId: awayTeamRecord.id,
                    commenceTime: new Date(commenceTime),
                    completed: false
                }
            });
            console.log(`[PROPS REPO] Created new game: ${gameRecord.id}`);
        } else {
            console.log(`[PROPS REPO] Using existing game: ${gameRecord.id}`);
        }

        // loop through each parsed prop and save it
        for (const prop of parsedProps) {
            try {
                console.log(`[PROPS REPO] Processing ${prop.playerName} - ${prop.propType}`);

                const playerInfo = await findPlayerInfo(prop.playerName, homeTeamRecord, awayTeamRecord);

                if (!playerInfo) {
                    console.log(`[PROPS REPO] Skipping ${prop.playerName} - not on either team`);
                    continue;
                }

                // create or update the player
                const playerRecord = await prisma.player.upsert({
                    where: {
                        name_teamId: {
                            name: prop.playerName,
                            teamId: playerInfo.teamId
                        }
                    },
                    update: {
                        active: true,
                        position: playerInfo.position
                    },
                    create: {
                        name: prop.playerName,
                        position: playerInfo.position,
                        teamId: playerInfo.teamId,
                        active: true
                    }
                });
                console.log(`[PROPS REPO] Player: ${playerRecord.name} (ID: ${playerRecord.id})`);

                // Find or create the player prop (no longer using unique constraint)
                const existingProp = await prisma.playerProp.findFirst({
                    where: {
                        gameId: gameRecord.id,
                        playerId: playerRecord.id,
                        propType: prop.propType,
                        line: prop.line,
                        source: 'theoddsapi'
                    }
                });

                let playerPropRecord;
                if (existingProp) {
                    console.log(`[PROPS REPO] PlayerProp already exists: ${existingProp.id}`);
                    playerPropRecord = existingProp;
                } else {
                    playerPropRecord = await prisma.playerProp.create({
                        data: {
                            gameId: gameRecord.id,
                            playerId: playerRecord.id,
                            propType: prop.propType,
                            line: prop.line,
                            source: 'theoddsapi'
                        }
                    });
                    console.log(`[PROPS REPO] PlayerProp created: ${playerPropRecord.id}`);
                }

                // save odds for each sportsbook
                console.log(`[PROPS REPO] Prop has ${prop.allOdds.length} sportsbooks with odds`);

                for (const oddsData of prop.allOdds) {
                    try {
                        console.log(`[PROPS REPO] Attempting to save odds from ${oddsData.sportsbook}`);

                        // find or create the sportsbook
                        const sportsbookRecord = await prisma.sportsbook.upsert({
                            where: {
                                name: oddsData.sportsbook
                            },
                            update: {},
                            create: {
                                name: oddsData.sportsbook,
                                key: oddsData.sportsbook.toLowerCase().replace(/\s+/g, '_'),
                                active: true
                            }
                        });

                        // create a propodds record (always create new, never update)
                        await prisma.propOdds.create({
                            data: {
                                propId: playerPropRecord.id,
                                sportsbookId: sportsbookRecord.id,
                                source: 'theoddsapi',  // Set the source
                                overOdds: oddsData.overOdds,
                                underOdds: oddsData.underOdds,
                                fetchedAt: new Date()
                            }
                        });
                        console.log(`[PROPS REPO] Saved odds from ${oddsData.sportsbook}`);
                    } catch (oddsError) {
                        console.error(`[PROPS REPO] Failed to save odds from ${oddsData.sportsbook}:`, oddsError);
                    }
                }
            } catch (propError) {
                console.error(`[PROPS REPO] Failed to save prop for ${prop.playerName}:`, propError);
            }
        }

        console.log(`[PROPS REPO] Successfully saved all props for game ${gameExternalId}`);

    } catch (error) {
        console.error('[PROPS REPO] Failed to save props', error);
    }
}

/**
 * save draftkings player props (alt lines)
 * stores historical data -> always creates new records on fetch
 */
export async function saveDraftKingsProps(dkEventId: string, homeTeam: string, awayTeam: string, commenceTime: string, dkProps: ParsedDKPlayerProp[]): Promise<void> {
    console.log(`[DK PROPS REPO] Saving ${dkProps.length} Draftkings prop for event: ${dkEventId}`);

    try {

        const normalizedHomeTeam = normalizeDKTeamName(homeTeam);
        const normalizedAwayTeam = normalizeDKTeamName(awayTeam);

        console.log(`[DK PROPS REPO] Original teams: ${awayTeam} @ ${homeTeam}`);
        console.log(`[DK PROPS REPO] Normalized teams: ${normalizedAwayTeam} @ ${normalizedHomeTeam}`);

        // Find EXISTING teams (don't create new ones)
        const homeTeamRecord = await prisma.team.findUnique({
            where: { name: normalizedHomeTeam }
        });

        const awayTeamRecord = await prisma.team.findUnique({
            where: { name: normalizedAwayTeam }
        });

        if (!homeTeamRecord || !awayTeamRecord) {
            throw new Error(
                `Teams not found in database. ` +
                `Home: ${normalizedHomeTeam} (${homeTeamRecord ? 'found' : 'MISSING'}), ` +
                `Away: ${normalizedAwayTeam} (${awayTeamRecord ? 'found' : 'MISSING'}). ` +
                `Run the roster sync first to populate teams.`
            );
        }

        console.log(`[DK PROPS REPO] Home team: ${homeTeamRecord.name} (${homeTeamRecord.abbreviation})`);
        console.log(`[DK PROPS REPO] Away team: ${awayTeamRecord.name} (${awayTeamRecord.abbreviation})`);

        // Create or update the game using EXISTING team IDs
        const gameExternalId = `dk_${dkEventId}`;

        let gameRecord = await prisma.game.findFirst({
            where: {
                homeTeamId: homeTeamRecord.id,
                awayTeamId: awayTeamRecord.id,
                commenceTime: {
                    gte: new Date(new Date(commenceTime).getTime() - 60 * 60 * 1000), // within 1 hour
                    lte: new Date(new Date(commenceTime).getTime() + 60 * 60 * 1000)
                }
            }
        });

        if (!gameRecord) {
            const gameExternalId = `dk_${dkEventId}`;
            gameRecord = await prisma.game.create({
                data: {
                    externalId: gameExternalId,
                    homeTeamId: homeTeamRecord.id,
                    awayTeamId: awayTeamRecord.id,
                    commenceTime: new Date(commenceTime),
                    completed: false
                }
            });
            console.log(`[DK PROPS REPO] Created new game: ${gameRecord.id}`);
        } else {
            console.log(`[DK PROPS REPO] Using existing game: ${gameRecord.id}`);
        }
        // get or create draftkings sports book (only once)
        const dkSportsbook = await prisma.sportsbook.upsert({
            where: { name: 'DraftKings' },
            update: {},
            create: {
                name: 'DraftKings',
                key: 'draftkings',
                active: true
            }
        });

        console.log(`[DK PROPS REPO] Draftkings sportsbook: ${dkSportsbook.id}`);

        // track stats
        let propsCreated = 0;
        let propsExisting = 0;
        let oddsCreated = 0;

        for (const prop of dkProps) {
            try {
                // skipping td props for now
                if (prop.line === null) {
                    console.log(`[DK PROPS REPO] Skipping TD prop: ${prop.playerName} ${prop.propType}`);
                    continue;
                }

                const playerInfo = await findPlayerInfo(prop.playerName, homeTeamRecord, awayTeamRecord);

                if (!playerInfo) {
                    console.log(`[DK PROPS REPO] Skipping ${prop.playerName} - not on either team`);
                    continue;
                }

                // create or update the player
                const playerRecord = await prisma.player.upsert({
                    where: {
                        name_teamId: {
                            name: prop.playerName,
                            teamId: playerInfo.teamId
                        }
                    },
                    update: {
                        active: true,
                        position: playerInfo.position
                    },
                    create: {
                        name: prop.playerName,
                        position: playerInfo.position,
                        teamId: playerInfo.teamId,
                        active: true
                    }
                });

                // find or create the player prop
                const existingProp = await prisma.playerProp.findFirst({
                    where: {
                        gameId: gameRecord.id,
                        playerId: playerRecord.id,
                        propType: prop.propType,
                        line: prop.line,
                        source: 'draftkings'
                    }
                });

                let playerPropRecord;
                if (existingProp) {
                    playerPropRecord = existingProp;
                    propsExisting++;
                } else {
                    playerPropRecord = await prisma.playerProp.create({
                        data: {
                            gameId: gameRecord.id,
                            playerId: playerRecord.id,
                            propType: prop.propType,
                            line: prop.line,
                            source: 'draftkings'
                        }
                    });
                    propsCreated++;
                }

                // always create new prop odds
                const oddsData = prop.allOdds[0]; // DK only has one set of odds per prop

                await prisma.propOdds.create({
                    data: {
                        propId: playerPropRecord.id,
                        sportsbookId: dkSportsbook.id,
                        source: 'draftkings',
                        overOdds: oddsData.overOdds,
                        underOdds: oddsData.underOdds,
                        fetchedAt: new Date()
                    }
                });
                oddsCreated++;
            } catch (propError) {
                console.error(`[DK PROPS REPO] Failed to save prop for ${prop.playerName}:`, propError);
            }
        }

        console.log(`[DK PROPS REPO] Summary: ${propsCreated} props created, ${propsExisting} props reused, ${oddsCreated} odds records created`);
        console.log(`[DK PROPS REPO] Successfully saved all DraftKings props for event ${dkEventId}`);

    } catch (error) {
        console.error('[DK PROPS REPO] Failed to save DK props: ', error);
        throw error;
    }
}


/**
 * helper to find which team a player is on
 */
/**
 * Normalize player names for matching
 * Removes apostrophes, hyphens, and extra spaces
 * Converts to lowercase for comparison
 */
function normalizePlayerName(name: string): string {
    return name
        .toLowerCase()
        .replace(/['\-\.]/g, '')  // Remove apostrophes, hyphens, periods
        .replace(/\s+/g, ' ')      // Normalize whitespace
        .trim();
}

/**
 * Find player info with fuzzy name matching
 * Handles variations like "DeVon" vs "De'Von"
 */
async function findPlayerInfo(playerName: string, homeTeam: { id: string; name: string }, awayTeam: { id: string; name: string }): Promise<{ teamId: string; position: string } | null> {
    console.log(`[PROPS REPO] Looking up team for: ${playerName}`);

    // First try exact match
    let mapping = await prisma.playerTeamMapping.findFirst({
        where: {
            playerName: playerName,
            active: true
        }
    });

    // If no exact match, try fuzzy match
    if (!mapping) {
        const normalizedSearch = normalizePlayerName(playerName);

        // Get all active players and find fuzzy match
        const allPlayers = await prisma.playerTeamMapping.findMany({
            where: { active: true }
        });

        mapping = allPlayers.find(p =>
            normalizePlayerName(p.playerName) === normalizedSearch
        ) || null;

        if (mapping) {
            console.log(`[PROPS REPO] Fuzzy matched: "${playerName}" → "${mapping.playerName}"`);
        }
    }

    if (!mapping) {
        console.log(`[PROPS REPO] ${playerName} not found in roster database`);
        return null;
    }

    // Check if player's team matches home team
    if (mapping.teamName === homeTeam.name) {
        console.log(`[PROPS REPO] ✓ Found on home team: ${homeTeam.name}`);
        return {
            teamId: homeTeam.id,
            position: mapping.position || 'UNKNOWN'
        };
    }

    // Check if player's team matches away team
    if (mapping.teamName === awayTeam.name) {
        console.log(`[PROPS REPO] ✓ Found on away team: ${awayTeam.name}`);
        return {
            teamId: awayTeam.id,
            position: mapping.position || 'UNKNOWN'
        };
    }

    // Player is on a different team (not in this game)
    console.log(`[PROPS REPO] ${playerName} is on ${mapping.teamName}, not playing in this game`);
    return null;
}

/**
 * Normalize DraftKings team names to match Odds API/ESPN format
 * DK: "MIA Dolphins" → "Miami Dolphins"
 * DK: "BAL Ravens" → "Baltimore Ravens"
 * DK: "LA Chargers" → "Los Angeles Chargers"
 */
function normalizeDKTeamName(dkTeamName: string): string {
    // map of DK abbreviations to full city names
    const cityMap: Record<string, string> = {
        'ARI': 'Arizona',
        'ATL': 'Atlanta',
        'BAL': 'Baltimore',
        'BUF': 'Buffalo',
        'CAR': 'Carolina',
        'CHI': 'Chicago',
        'CIN': 'Cincinnati',
        'CLE': 'Cleveland',
        'DAL': 'Dallas',
        'DEN': 'Denver',
        'DET': 'Detroit',
        'GB': 'Green Bay',
        'HOU': 'Houston',
        'IND': 'Indianapolis',
        'JAX': 'Jacksonville',
        'KC': 'Kansas City',
        'LA': 'Los Angeles',    // DK uses "LA" for both Chargers and Rams
        'LAC': 'Los Angeles',
        'LAR': 'Los Angeles',
        'LV': 'Las Vegas',
        'MIA': 'Miami',
        'MIN': 'Minnesota',
        'NE': 'New England',
        'NO': 'New Orleans',
        'NY': 'New York',
        'NYG': 'New York',
        'NYJ': 'New York',
        'PHI': 'Philadelphia',
        'PIT': 'Pittsburgh',
        'SEA': 'Seattle',
        'SF': 'San Francisco',
        'TB': 'Tampa Bay',
        'TEN': 'Tennessee',
        'WAS': 'Washington'
    };

    // dK format: "MIA Dolphins" → extract "MIA" and "Dolphins"
    const parts = dkTeamName.split(' ');
    if (parts.length >= 2) {
        const abbr = parts[0];
        const mascot = parts.slice(1).join(' ');  // Handle multi-word mascots

        const city = cityMap[abbr];
        if (city) {
            const normalized = `${city} ${mascot}`;
            console.log(`[PROPS REPO] Normalized DK team: "${dkTeamName}" → "${normalized}"`);
            return normalized;
        }
    }

    // if normalization fails, return as-is (shouldn't happen with proper DK data)
    console.warn(`[PROPS REPO] Could not normalize DK team name: "${dkTeamName}"`);
    return dkTeamName;
}
