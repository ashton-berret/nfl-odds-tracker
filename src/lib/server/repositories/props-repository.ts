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
            where: { name: homeTeam }, // look for team with exact name
            update: {}, // don't change anything if found
            create: {
                name: homeTeam,
                abbreviation: homeTeam.split(' ').pop() || homeTeam // get the team name following the city
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

        // create or update the game, using externalId from the API as a unique identifier so if we fetch the same game twice, we update rather than creating a duplicate
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

                // need to map players to team - probably implement a roster database or just use API if free
                // for now we just assign everyone to home team
                let playerTeamId = homeTeamRecord.id;

                // create or update the player -> use a compound unique key of name + team
                const playerRecord = await prisma.player.upsert({
                    where: {
                        name_teamId: {
                            name: prop.playerName,
                            teamId: playerTeamId
                        }
                    },
                    update: {active: true}, // if player exists set them to active
                    create: {
                        name: prop.playerName,
                        position: 'UNKNOWN', // have to get from alt api
                        teamId: playerTeamId,
                        active: true
                    }
                });
                console.log(`[PROPS REPO] Player: ${playerRecord.name} (ID: ${playerRecord.id})`);

                // create or update the player prop with the constraint of gameId + playerId + propType + line
                // if we get the same prop twice, we just update it but all of those constraints must be exact same so if lines change, we get both records
                const playerPropRecord = await prisma.playerProp.upsert({
                    where: {
                        gameId_playerId_propType_line: {
                            gameId: gameRecord.id,
                            playerId: playerRecord.id,
                            propType: prop.propType,
                            line: prop.line
                        }
                    },
                    update: {},
                    create: {
                        gameId: gameRecord.id,
                        playerId: playerRecord.id,
                        propType: prop.propType,
                        line: prop.line
                    }
                });
                console.log(`[PROPS REPO] PlayerProp created/found at: ${playerPropRecord.id}`);

                // save odds for each sportsbook
                /**
                 * props.allOdds looks like
                 * [
                 *  { sportsbook: 'name', overOdds: num, underOdds: num}
                        * ]
                    */
                console.log(`[PropsRepo]   Prop has ${prop.allOdds.length} sportsbooks with odds`);
                console.log(`[PropsRepo]   allOdds data:`, JSON.stringify(prop.allOdds, null, 2));

                for (const oddsData of prop.allOdds) {
                    try {
                        console.log(`[PropsRepo] Attempting to save odds from ${oddsData.sportsbook}`);
                        // find or create the sportsbook first using the sportsbook database id to link the odds to it
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

                        // create a propodds record but do not update, always create a new record -> upsert loses historical data
                        await prisma.propOdds.create({
                            data: {
                                propId: playerPropRecord.id,
                                sportsbookId: sportsbookRecord.id,
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
