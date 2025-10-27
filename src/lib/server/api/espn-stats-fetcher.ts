import fetch from 'node-fetch';

interface PlayerStats {
    playerId: string;
    playerName: string;
    passingYards: number;
    passingTouchdowns: number;
    rushingYards: number;
    rushingTouchdowns: number;
    receivingYards: number;
    receivingTouchdowns: number;
}

interface GameResult {
    gameId: string;
    completed: boolean;
    homeScore: number;
    awayScore: number;
    playerStats: PlayerStats[];
}

interface ESPNGame {
    id: string;
    name: string; // "Team A at Team B"
    shortName: string; // "TEAM1 @ TEAM2"
    date: string;
    status: {
        type: {
            completed: boolean;
        };
    };
    competitions: Array<{
        competitors: Array<{
            team: {
                displayName: string;
                abbreviation: string;
            };
            homeAway: 'home' | 'away';
        }>;
    }>;
}


export class ESPNStatsFetcher {
    private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

    /**
     * find espn game ID by m atching team names and date
     */
    async findESPNGameId(homeTeam: string, awayTeam: string, gameDate: Date): Promise<string | null> {
        console.log('[ESPNStatsFetcher] Searching for game:', awayTeam, '@', homeTeam, 'on', gameDate);

        try {
            // fetch current week's scoreboard
            const url = `${this.baseUrl}/scoreboard`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[ESPNStatsFetcher] HTTP error:', response.status);
                return null;
            }

            const data: any = await response.json();
            const events: ESPNGame[] = data.events || [];

            console.log('[ESPNStatsFetcher] Found', events.length, 'games in ESPN scoreboard');

            // try to match by team names
            for (const event of events) {
                const competition = event.competitions?.[0];
                if (!competition) continue;

                const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
                const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

                if (!homeCompetitor || !awayCompetitor) continue;

                const espnHomeTeam = homeCompetitor.team.displayName;
                const espnAwayTeam = awayCompetitor.team.displayName;

                // match team names (case-insensitive, flexible matching)
                const homeMatch = this.teamsMatch(homeTeam, espnHomeTeam);
                const awayMatch = this.teamsMatch(awayTeam, espnAwayTeam);

                // also check if dates are close (within 24 hours)
                const eventDate = new Date(event.date);
                const timeDiff = Math.abs(eventDate.getTime() - gameDate.getTime());
                const hoursDiff = timeDiff / (1000 * 60 * 60);

                if (homeMatch && awayMatch && hoursDiff < 24) {
                    console.log('[ESPNStatsFetcher] ✓ Match found! ESPN game ID:', event.id);
                    return event.id;
                }
            }

            console.log('[ESPNStatsFetcher] No matching game found');
            return null;

        } catch (error) {
            console.error('[ESPNStatsFetcher] Error finding game:', error);
            return null;
        }
    }

    /**
     * Check if two team names match (flexible matching)
     */
    private teamsMatch(team1: string, team2: string): boolean {
        const normalize = (name: string) => name.toLowerCase().trim();

        const t1 = normalize(team1);
        const t2 = normalize(team2);

        // Exact match
        if (t1 === t2) return true;

        // Check if one contains the other (handles "49ers" vs "San Francisco 49ers")
        if (t1.includes(t2) || t2.includes(t1)) return true;

        // Extract key words (last word usually identifies team)
        const t1Words = t1.split(' ');
        const t2Words = t2.split(' ');
        const t1LastWord = t1Words[t1Words.length - 1];
        const t2LastWord = t2Words[t2Words.length - 1];

        // Match on last word (e.g., "Chiefs" in "Kansas City Chiefs")
        if (t1LastWord === t2LastWord && t1LastWord.length > 3) return true;

        return false;
    }

    /**
     * fetch game results and player stats
     * @param espnGameId (stored in Game.externalId)
     */
    async fetchGameStats(espnGameId: string): Promise<GameResult | null> {
        console.log('[ESPNStatsFetcher] Fetching stats for game:', espnGameId);

        try {
            const url = `${this.baseUrl}/summary?event=${espnGameId}`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('[ESPNStatsFetcher] HTTP error:', response.status);
                return null;
            }

            const data: any = await response.json();

            // DEBUG: Log the full structure to see what we're getting
            console.log('[ESPNStatsFetcher] Response keys:', Object.keys(data));
            console.log('[ESPNStatsFetcher] Has boxscore?', !!data.boxscore);

            if (data.boxscore) {
                console.log('[ESPNStatsFetcher] Boxscore keys:', Object.keys(data.boxscore));
                console.log('[ESPNStatsFetcher] Has players?', !!data.boxscore.players);
            }

            // Check if game is completed
            const status = data.header?.competitions?.[0]?.status;
            const completed = status?.type?.completed === true;

            console.log('[ESPNStatsFetcher] Game completed?', completed);
            console.log('[ESPNStatsFetcher] Status:', status?.type?.description);

            if (!completed) {
                console.log('[ESPNStatsFetcher] Game not completed yet');
                return null;
            }

            // Get scores
            const competition = data.header.competitions[0];
            const homeTeam = competition.competitors.find((t: any) => t.homeAway === 'home');
            const awayTeam = competition.competitors.find((t: any) => t.homeAway === 'away');

            const homeScore = parseInt(homeTeam?.score || '0');
            const awayScore = parseInt(awayTeam?.score || '0');

            console.log('[ESPNStatsFetcher] Final score:', awayTeam?.team?.displayName, awayScore, '-', homeTeam?.team?.displayName, homeScore);

            // Parse player stats from box score
            const playerStats = this.parseBoxScore(data.boxscore);

            console.log('[ESPNStatsFetcher] Parsed stats for', playerStats.length, 'players');

            return {
                gameId: espnGameId,
                completed: true,
                homeScore,
                awayScore,
                playerStats
            };

        } catch (error) {
            console.error('[ESPNStatsFetcher] Error fetching game stats:', error);
            return null;
        }
    }
    /**
     * parse box score
     */
    private parseBoxScore(boxscore: any): PlayerStats[] {
        const allPlayerStats: PlayerStats[] = [];

        if (!boxscore?.players) {
            console.log('[ESPN STATS FETCHER] No boxscore data available');
            return allPlayerStats;
        }

        // box score has stats for both teams
        for (const teamStats of boxscore.players) {
            const statistics = teamStats.statistics || [];

            for (const statCategory of statistics) {
                const categoryName = statCategory.name;
                const athletes = statCategory.athletes || [];

                for (const athleteData of athletes) {
                    const athlete = athleteData.athlete;
                    const stats = athleteData.stats || [];

                    // find or create a player stats entry
                    let playerStat = allPlayerStats.find(p => p.playerId === athlete.id);
                    if (!playerStat) {
                        playerStat = {
                            playerId: athlete.id,
                            playerName: athlete.displayName,
                            passingYards: 0,
                            passingTouchdowns: 0,
                            rushingYards: 0,
                            rushingTouchdowns: 0,
                            receivingYards: 0,
                            receptions: 0,
                            receivingTouchdowns: 0
                        };
                        allPlayerStats.push(playerStat);
                    }

                    // parse based on category
                    if (categoryName === 'passing') {
                        // format: [C/ATT, YDS, TD, INT]
                        playerStat.passingYards = parseInt(stats[1] || 0);
                        playerStat.passingTouchdowns = parseInt(stats[2] || 0);
                    } else if (categoryName === 'rushing') {
                        // format: [CAR, YDS, AVG, TD, LONG]
                        playerStat.rushingYards = parseInt(stats[1] || 0);
                        playerStat.rushingTouchdowns = parseInt(stats[3] || 0);
                    } else if (categoryName === 'receiving') {
                        // format: [REC, YDS, AVG, TD, LONG, TGTS]
                        playerStat.receivingYards = parseInt(stats[1] || 0);
                        playerStat.receptions = parseInt(stats[0] || 0);
                        playerStat.receivingTouchdowns = parseInt(stats[3] || 0);
                    }
                }
            }
        }

        return allPlayerStats;
    }

    /**
     * map player name to stats in case we dont have their espn id stored
     */
    findPlayerStatsByName(playerStats: PlayerStats[], playerName: string): PlayerStats | null {
        // try exact match first
        let match = playerStats.find(p => p.playerName.toLowerCase() === playerName.toLowerCase());

        if (!match) {
            const lastName = playerName.split(' ').pop()?.toLowerCase();
            match = playerStats.find(p => p.playerName.toLowerCase().includes(lastName || ''));
        }

        return match || null;
    }
}
