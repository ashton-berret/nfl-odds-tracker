/**
 * Use the unofficial espn api to get team's roster info
 * base url is -> https://site.api.espn.com/apis/site/v2/sports/football/nfl
 *
 * curl -X POST http://localhost:5173/api/sync-rosters
 */
import fetch from 'node-fetch';


interface ESPNTeam {
    team: {
        id: string;
        displayName: string;
        abbreviation: string;
    };
}

interface ESPNPosition {
    id: string;
    uid: string;
    guid: string;
    firstName: string;
    lastName: string;
    fullName: string;
    displayName: string;
    shortName: string;
    jersey?: string;
    position: ESPNPosition;
}

interface ESPNRosterResponse {
    athletes: Array<{
        position: string;
        items: ESPNAthlete[];
    }>;
}

export class ESPNFetcher {
    private baseUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

    /**
     * Fetch all nfl teams, returning an array of 32 teams with their basic info
     */
    async fetchAllTeams(): Promise<ESPNTeam[]> {
        const url = `${this.baseUrl}/teams`;
        console.log(`[ESPN] fetching all nfl teams from ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                  },
                  // Increase timeout to 30 seconds
                  signal: AbortSignal.timeout(30000)
                });
            if (!response.ok) {
                throw new Error(`ESPN API Error: ${response.status}`);
            }

            const data = await response.json();

            // espns structure is {sports: [{leagues: [{teams: [...] }] }] } so we have to dig through the structure
            const teams = data.sports[0].leagues[0].teams;
            console.log(`[ESPN] Found ${teams.length} NFL teams`);
            return teams;
        } catch (error) {
            console.error('[ESPN] Failed to fetch teams:', error);
            throw error;
        }
    }

    async fetchTeamRoster(teamId: string): Promise<ESPNAthlete[]> {
        const url = `${this.baseUrl}/teams/${teamId}/roster`;
        console.log(`[ESPN] Fetching roster for team: ${teamId}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: AbortSignal.timeout(30000)
            });

            if (!response.ok) {
                throw new Error(`ESPN API Error: ${response.status}`);
            }

            const data: ESPNRosterResponse = await response.json();

            // espn groups players by positional group (offense, defense, etc)
            // flatten all the items arrays into a single array of players
            const allPlayers: ESPNAthlete[] = [];

            for (const group of data.athletes) {
                console.log(`[ESPN] Found ${group.items.length} ${group.position} players`);
                allPlayers.push(...group.items);
            }

            console.log(`[ESPN] Total: ${allPlayers.length} players on roster`);
            return allPlayers;
        } catch (error) {
            console.error(`[ESPN] Failed to fetch roster for ${teamId}:`, error);
            throw error;
        }
    }
}
