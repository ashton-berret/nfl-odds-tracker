// src/lib/server/repositories/props-repository.ts

import { prisma } from '$lib/server/db';
import type { ParsedPlayerProp } from '$lib/server/api/props-parser';

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
        const gameRecord = await prisma.game.upsert({
            where: { externalId: gameExternalId },
            update: {
                commenceTime: new Date(commenceTime)
            },
            create: {
                externalId: gameExternalId,
                homeTeamId: homeTeamRecord.id,
                awayTeamId: awayTeamRecord.id,
                commenceTime: new Date(commenceTime),
                completed: false
            }
        });
        console.log(`[PROPS REPO] Game: ${gameRecord.id}`);

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
                        line: prop.line
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
                            line: prop.line
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
 * helper to find which team a player is on
 */
async function findPlayerInfo(playerName: string, homeTeam: { id: string; name: string }, awayTeam: { id: string; name: string }): Promise<{ teamId: string; position: string } | null> {
    console.log(`[PROPS REPO] Looking up team for: ${playerName}`);

    const mapping = await prisma.playerTeamMapping.findFirst({
        where: {
            playerName: playerName,
            active: true
        }
    });

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
