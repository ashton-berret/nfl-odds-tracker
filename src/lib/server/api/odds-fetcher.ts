/**
 * Typescript interface for OddsApiResponse
 */

interface OddsAPIEvent {
    // what fields does the /events endpoint return?
    id:         string;
    sport_key:  string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;


}

interface OddsAPIEventOdds {
    // what fields does the /events/{eventId}/odds endpoint return
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Array<{
        key: string;
        title: string;
        markets: Array<{
            key: string;
            last_update: string;
            outcomes: Array<{
                name: string;
                description: string;
                price: number; // american odds
                point?: number;
            }>;
        }>;
    }>;
}

interface Bookmaker {
    key: string;
    title: string;
    markets: Array<{
        key: string;
        last_update: string;
        outcomes: Array <{
            name: string;
            description: string;
            price: number;
            point?: number;
        }>;
    }>;
}

interface Market {
    key: string;
    last_update: string;
    outcomes: Array<{
        name: string;
        description: string;
        price: number;
        point?: number
    }>;
}

interface Outcome {
    name: string;
    description: string;
    price: number;
    point?: number
}

export class OddsFetcher {
    private apiKey: string;
    private baseUrl = 'https://api.the-odds-api.com/v4';
    private nflParam = '/sports/americanfootball_nfl/events/';
;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async fetchUpcomingGames(): Promise<OddsAPIEvent[]> {
        const url = `${this.baseUrl}${this.nflParam}`;
        const params = new URLSearchParams({
            apiKey: this.apiKey
        });

        console.log(`[OddsFetcher] Fetching upcoming games`);

        const response = await fetch(`${url}?${params}`);

        if (!response.ok) {
            const error = await response.text();
            console.error(`[OddsFetcher] Error: ${error}`);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[OddsFetcher] Found ${data.length} upcoming games`);

        return data;
    }

    /**
     * fetch player props for a given game id
     * cost is num_markets * num_regions
     */
    async fetchPlayerPropsForGames(
        eventId: string,
        markets: string[] = ['player_rush_yds', 'player_reception_yds', 'player_pass_yds', 'player_pass_tds', 'player_receptions', 'player_reception_tds', 'player_rush_tds', 'player_anytime_td']
    ): Promise<OddsAPIEventOdds> {

        const url = `${this.baseUrl}${this.nflParam}${eventId}/odds`
        const params = new URLSearchParams({
            apiKey: this.apiKey,
            regions: 'us',
            markets: markets.join(','),
            oddsFormat: 'american'
        });

        console.log(`[OddsFetcher] fetching props for game ${eventId}, markets: ${markets.join(',')} at url: ${url}`);

        const response = await fetch(`${url}?${params}`);

        // log rate limit headers
        const remaining = response.headers.get('x-requests-remaining');
        const used = response.headers.get('x-requests-used');
        const lastCost = response.headers.get('x-requests-last');

        console.log(`[OddsFetcher] API Usage - Remaining: ${remaining}, Used: ${used}, Last Cost: ${lastCost}`);

        if (!response.ok) {
            const error = await response.text();
            console.error(`[OddsFetcher] Error: ${error}`);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[OddsFetcher] received props for game ${eventId}`);

        return data;

    }

    async fetchAllPlayerProps(markets: string[] = ['player_rush_yds', 'player_reception_yds', 'player_pass_yds', 'player_pass_tds', 'player_receptions', 'player_reception_tds', 'player_rush_tds', 'player_anytime_td']): Promise<OddsAPIEventOdds[]> {
        console.log(`[OddsFetcher] Starting full fetch...`);

        // first get full list of games
        const games = await this.fetchUpcomingGames();
        console.log(`[OddsFetcher] Will fetch props for ${games.length} games`);

        const allProps = [];

        for (const game of games) {
            try {
                const props = await this.fetchPlayerPropsForGames(game.id, markets);
                allProps.push(props);

                // add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`[OddsFetcher] Failed to fetch props for game: ${game.id}:`, error);
                // continue with other games
            }
        }

        console.log(`[OddsFetcher] Successfully fetched props for ${allProps.length} games`);
        return allProps;

    }
}
