// src/lib/server/api/draftkings-fetcher.ts

/**
 * DraftKings API Response Structure
 * Endpoint: /sites/US-LA-SB/api/sportscontent/controldata/league/leagueSubcategory/v1/markets
 */

export interface DKResponse {
    sports: DKSport[];
    leagues: DKLeague[];
    events: DKEvent[];
    markets: DKMarket[];
    selections: DKSelection[];
}

export interface DKSport {
    id: string;
    seoIdentifier: string;
    name: string;
    sortOrder: number;
}

export interface DKLeague {
    id: string;
    seoIdentifier: string;
    name: string;
    sportId: string;
    sortOrder: number;
    tags: string[];
    isTeamSwap: boolean;
}

export interface DKEvent {
    id: string;
    seoIdentifier: string;
    sportId: string;
    leagueId: string;
    name: string;  // "BAL Ravens @ MIA Dolphins"
    startEventDate: string;  // ISO 8601 format
    participants: DKParticipant[];
    eventParticipantType: string;
    status: string;
    media: DKMedia[];
    tags: string[];
    metadata: {
        masterLeagueId?: string;
        numberOfParts?: string;
        secondsInOnePart?: string;
    };
    sortOrder: number;
    subscriptionKey: string;
}

export interface DKParticipant {
    id: string;
    name: string;  // "MIA Dolphins"
    venueRole: "Home" | "Away";
    type: "Team";
    metadata: {
        retailRotNumber: string;
        rosettaTeamId: string;
        rosettaTeamName: string;  // Just "Dolphins"
        shortName: string;  // "MIA"
        teamColor: string;
    };
    sortOrder: number;
    seoIdentifier: string;
    isNationalTeam: boolean;
    countryCode: string;
}

export interface DKMedia {
    providerName: string;
    providerEventId: string;
    mediaType: string;
    metadata?: Record<string, unknown>;
    allowedDmas?: string[];
}

export interface DKMarket {
    id: string;
    eventId: string;
    sportId: string;
    leagueId: string;
    name: string;  // "Anytime TD Scorer", "First TD Scorer"
    subcategoryId: string;
    componentMapping: {
        primary: number;
        fallback: number;
    };
    marketType: {
        id: string;
        betOfferTypeId: number;
        name: string;  // "Anytime Touchdown Scorer"
    };
    subscriptionKey: string;
    sortOrder: number;
    tags: string[];
    correlatedId: string;
    dynamicMetadata: Record<string, unknown>;
}

export interface DKSelection {
    id: string;  // Complex ID like "0QA286526416#381853172_13L88808Q1472369560Q20"
    marketId: string;
    label: string;  // Player name: "Derrick Henry"
    displayOdds: {
        american: string;  // "+400" (string, not number!)
        decimal: string;   // "5.00"
        fractional?: string;  // "4/1"
    };
    trueOdds: number;  // 5.0 (decimal)
    outcomeType: string;  // "ToScoreFirst", "ToScoreAnytime", etc.
    participants: DKSelectionParticipant[];
    sortOrder: number;
    tags: string[];
    metadata: Record<string, unknown>;
}

export interface DKSelectionParticipant {
    id: string;  // DK's player ID
    name: string;  // "Derrick Henry"
    type: "Player";
    seoIdentifier: string;
    venueRole: "HomePlayer" | "AwayPlayer";
    isNationalTeam: boolean;
}

/**
 * DraftKings API Fetcher
 * Handles fetching player props from DraftKings sportsbook
 */
export class DraftKingsFetcher {
    private baseUrl = 'https://sportsbook-nash.draftkings.com/sites/US-LA-SB/api/sportscontent/controldata/league/leagueSubcategory/v1/markets';
    private nflLeagueId = '88808';

    /**
     * Subcategory IDs for different prop types
     * Found by inspecting DraftKings network requests
     */
    private readonly SUBCATEGORY_IDS = {
        RUSHING_YARDS: '16571',
        RECEIVING_YARDS: '16570',
        PASSING_YARDS: '16569',
        TD_SCORERS: '12438',
    } as const;

    /**
     * Map DK market names to our internal prop types
     */
    private readonly MARKET_TYPE_MAP: Record<string, string> = {
        // TD props
        'Anytime TD Scorer': 'anytime_td',
        'Anytime Touchdown Scorer': 'anytime_td',
        'First TD Scorer': 'first_td',
        '1st Touchdown Scorer': 'first_td',
        '2+ TDs': '2plus_td',
        'Score 2 or More': '2plus_td',

        // Yardage props will be inferred from subcategory context
    };

    constructor() {
        console.log('[DraftKingsFetcher] Initialized with NFL league ID:', this.nflLeagueId);
    }

    /**
     * Build the DraftKings API URL with proper query parameters
     */
    private buildUrl(subcategoryId: string): string {
        // Build OData filter queries (matches DK's exact format)
        const eventsQuery = `$filter=leagueId eq '${this.nflLeagueId}' AND clientMetadata/Subcategories/any(s: s/Id eq '${subcategoryId}')`;
        const marketsQuery = `$filter=clientMetadata/subCategoryId eq '${subcategoryId}' AND tags/all(t: t ne 'SportcastBetBuilder')`;

        const params = new URLSearchParams({
            isBatchable: 'false',
            templateVars: `${this.nflLeagueId},${subcategoryId}`,
            eventsQuery: eventsQuery,
            marketsQuery: marketsQuery,
            include: 'Events',
            entity: 'events'
        });

        const url = `${this.baseUrl}?${params.toString()}`;
        console.log(`[DraftKingsFetcher] Built URL for subcategory ${subcategoryId}`);

        return url;
    }

    /**
     * Fetch props for a specific subcategory
     */
    async fetchSubcategory(subcategoryId: string, subcategoryName?: string): Promise<DKResponse> {
        const url = this.buildUrl(subcategoryId);

        console.log(`[DraftKingsFetcher] Fetching ${subcategoryName || subcategoryId}...`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DraftKingsFetcher] API Error ${response.status}`);
                console.error(`[DraftKingsFetcher] Error body: ${errorText.substring(0, 200)}`);
                throw new Error(`DraftKings API returned ${response.status} for subcategory ${subcategoryId}`);
            }

            const data: DKResponse = await response.json();

            console.log(`[DraftKingsFetcher] ${subcategoryName || subcategoryId} results:`);
            console.log(`  Events: ${data.events?.length || 0}`);
            console.log(`  Markets: ${data.markets?.length || 0}`);
            console.log(`  Selections: ${data.selections?.length || 0}`);

            return data;

        } catch (error) {
            console.error(`[DraftKingsFetcher] Failed to fetch ${subcategoryName || subcategoryId}:`, error);
            throw error;
        }
    }

    /**
     * Fetch all core player props
     * Makes 4 API calls (one per prop type)
     * Returns merged response
     */
    async fetchAllPlayerProps(): Promise<DKResponse> {
        console.log('[DraftKingsFetcher] Starting full fetch of all core prop types');

        const subcategories = [
            { id: this.SUBCATEGORY_IDS.RUSHING_YARDS, name: 'Rushing Yards' },
            { id: this.SUBCATEGORY_IDS.RECEIVING_YARDS, name: 'Receiving Yards' },
            { id: this.SUBCATEGORY_IDS.PASSING_YARDS, name: 'Passing Yards' },
            { id: this.SUBCATEGORY_IDS.TD_SCORERS, name: 'TD Scorers' },
        ];

        console.log(`[DraftKingsFetcher] Will fetch ${subcategories.length} subcategories`);

        const responses: DKResponse[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const subcategory of subcategories) {
            try {
                const response = await this.fetchSubcategory(subcategory.id, subcategory.name);
                responses.push(response);
                successCount++;

                // Rate limiting: 200ms delay between requests
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                failCount++;
                console.error(`[DraftKingsFetcher] Skipping ${subcategory.name} due to error`);
                // Continue with other subcategories even if one fails
            }
        }

        console.log(`[DraftKingsFetcher] Fetch complete: ${successCount} succeeded, ${failCount} failed`);

        if (responses.length === 0) {
            throw new Error('All DraftKings API calls failed');
        }

        // Merge all responses into one unified structure
        return this.mergeResponses(responses);
    }

    /**
     * Merge multiple API responses into one unified response
     * Deduplicates events while combining markets and selections
     */
    private mergeResponses(responses: DKResponse[]): DKResponse {
        console.log(`[DraftKingsFetcher] Merging ${responses.length} responses`);

        if (responses.length === 0) {
            throw new Error('No responses to merge');
        }

        // Dedupe events by ID (same game appears in multiple prop types)
        const eventsMap = new Map<string, DKEvent>();
        responses.forEach(response => {
            response.events?.forEach(event => {
                if (!eventsMap.has(event.id)) {
                    eventsMap.set(event.id, event);
                    console.log(`[DraftKingsFetcher] Added event: ${event.name}`);
                }
            });
        });

        // Combine all markets and selections (should be unique per subcategory)
        const allMarkets = responses.flatMap(r => r.markets || []);
        const allSelections = responses.flatMap(r => r.selections || []);

        const merged: DKResponse = {
            sports: responses[0]?.sports || [],
            leagues: responses[0]?.leagues || [],
            events: Array.from(eventsMap.values()),
            markets: allMarkets,
            selections: allSelections
        };

        console.log(`[DraftKingsFetcher] Merge complete:`);
        console.log(`  Total events: ${merged.events.length}`);
        console.log(`  Total markets: ${merged.markets.length}`);
        console.log(`  Total selections: ${merged.selections.length}`);

        return merged;
    }

    /**
     * Map DK market name to our internal prop type
     * Returns null if market type is not supported
     */
    mapMarketTypeToPropType(marketName: string): string | null {
        const mapped = this.MARKET_TYPE_MAP[marketName];

        if (!mapped) {
            console.log(`[DraftKingsFetcher] Unmapped market type: "${marketName}"`);
            return null;
        }

        return mapped;
    }

    /**
     * Parse DK's american odds string to integer
     * "+400" -> 400
     * "-110" -> -110
     */
    parseAmericanOdds(oddsString: string): number {
        const cleaned = oddsString.replace('+', '');
        const parsed = parseInt(cleaned, 10);

        if (isNaN(parsed)) {
            console.error(`[DraftKingsFetcher] Failed to parse odds: "${oddsString}"`);
            throw new Error(`Invalid odds format: ${oddsString}`);
        }

        console.log(`[DraftKingsFetcher] Parsed odds: ${oddsString} -> ${parsed}`);
        return parsed;
    }

    /**
     * Extract team names from DK event
     * Returns the full participant names (e.g., "MIA Dolphins", "BAL Ravens")
     */
    parseTeamNamesFromEvent(event: DKEvent): { away: string; home: string } | null {
        console.log(`[DraftKingsFetcher] Parsing team names from event: "${event.name}"`);

        const homeParticipant = event.participants.find(p => p.venueRole === 'Home');
        const awayParticipant = event.participants.find(p => p.venueRole === 'Away');

        if (!homeParticipant || !awayParticipant) {
            console.error(`[DraftKingsFetcher] Could not find home/away participants in event ${event.id}`);
            return null;
        }

        console.log(`[DraftKingsFetcher] Found teams: ${awayParticipant.name} @ ${homeParticipant.name}`);

        return {
            away: awayParticipant.name,
            home: homeParticipant.name
        };
    }
}
