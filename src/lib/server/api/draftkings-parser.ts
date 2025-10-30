// src/lib/server/api/draftkings-parser.ts

import type { DKResponse, DKEvent, DKMarket, DKSelection } from './draftkings-fetcher';

/**
 * Parsed prop format matching The Odds API parser
 * This allows both parsers to feed into the same repository
 */
export interface ParsedDKPlayerProp {
    playerName: string;
    propType: string;
    line: number | null;  // null for TD props
    allOdds: Array<{
        sportsbook: string;
        overOdds?: number;   // for yardage props
        underOdds?: number;  // for yardage props
        outcomeType?: string;  // for TD props: "anytime_td", "first_td", "2plus_td"
        singleOdds?: number;   // for TD props: the single price
    }>;
}

export class DraftKingsParser {
    /**
     * Map DK subcategory IDs to prop types
     */
    private readonly SUBCATEGORY_TO_PROP_TYPE: Record<string, string> = {
        '16571': 'player_rush_yds',
        '16570': 'player_reception_yds',
        '16569': 'player_pass_yds',
        '12438': 'touchdown',  // Special handling - multiple types
    };

    /**
     * Map DK market names to prop types (for TD markets)
     */
    private readonly MARKET_NAME_TO_PROP_TYPE: Record<string, string> = {
        'Anytime TD Scorer': 'anytime_td',
        'Anytime Touchdown Scorer': 'anytime_td',
        'First TD Scorer': 'first_td',
        '1st Touchdown Scorer': 'first_td',
        '2+ TDs': '2plus_td',
        'Score 2 or More': '2plus_td',
    };

    /**
     * Map DK outcome types to our prop types
     */
    private readonly OUTCOME_TYPE_TO_PROP_TYPE: Record<string, string> = {
        'ToScoreAnytime': 'anytime_td',
        'ToScoreFirst': 'first_td',
        'ToScore2Plus': '2plus_td',
    };

    constructor() {
        console.log('[DraftKingsParser] Initialized');
    }

    /**
     * Parse DK response into player props grouped by game
     */
    parseResponse(data: DKResponse): Map<string, ParsedDKPlayerProp[]> {
        console.log('[DraftKingsParser] Starting parse of DK response');
        console.log(`[DraftKingsParser] Total selections: ${data.selections.length}`);

        // Group by event ID
        const propsByEvent = new Map<string, ParsedDKPlayerProp[]>();

        // Create lookup maps
        const eventsMap = new Map<string, DKEvent>();
        data.events.forEach(e => eventsMap.set(e.id, e));

        const marketsMap = new Map<string, DKMarket>();
        data.markets.forEach(m => marketsMap.set(m.id, m));

        // Process each selection
        for (const selection of data.selections) {
            const market = marketsMap.get(selection.marketId);
            if (!market) {
                console.log(`[DraftKingsParser] Skipping selection ${selection.id} - no market found`);
                continue;
            }

            const event = eventsMap.get(market.eventId);
            if (!event) {
                console.log(`[DraftKingsParser] Skipping selection ${selection.id} - no event found`);
                continue;
            }

            // Determine prop type
            const propType = this.determinePropType(market, selection);
            if (!propType) {
                console.log(`[DraftKingsParser] Skipping selection ${selection.id} - unknown prop type: ${market.name}`);
                continue;
            }

            // Extract player name
            const playerName = selection.label;
            if (!playerName || playerName === 'No Touchdown Scorer') {
                continue;
            }

            // Parse the selection into a prop
            const prop = this.parseSelection(selection, market, propType);
            if (!prop) {
                continue;
            }

            // Add to event's props
            if (!propsByEvent.has(event.id)) {
                propsByEvent.set(event.id, []);
            }
            propsByEvent.get(event.id)!.push(prop);
        }

        console.log(`[DraftKingsParser] Parsed props for ${propsByEvent.size} events`);
        propsByEvent.forEach((props, eventId) => {
            console.log(`[DraftKingsParser]   Event ${eventId}: ${props.length} props`);
        });

        return propsByEvent;
    }

    /**
     * Determine prop type from market and selection
     */
    private determinePropType(market: DKMarket, selection: DKSelection): string | null {
        // Check if it's a TD prop by market name
        const tdPropType = this.MARKET_NAME_TO_PROP_TYPE[market.name];
        if (tdPropType) {
            console.log(`[DraftKingsParser] Identified TD prop: ${market.name} -> ${tdPropType}`);
            return tdPropType;
        }

        // Check by outcome type
        const outcomePropType = this.OUTCOME_TYPE_TO_PROP_TYPE[selection.outcomeType];
        if (outcomePropType) {
            console.log(`[DraftKingsParser] Identified by outcome type: ${selection.outcomeType} -> ${outcomePropType}`);
            return outcomePropType;
        }

        // Check by subcategory
        const subcategoryPropType = this.SUBCATEGORY_TO_PROP_TYPE[market.subcategoryId];
        if (subcategoryPropType && subcategoryPropType !== 'touchdown') {
            console.log(`[DraftKingsParser] Identified by subcategory: ${market.subcategoryId} -> ${subcategoryPropType}`);
            return subcategoryPropType;
        }

        return null;
    }

    /**
     * Parse a single selection into a prop
     */
    private parseSelection(selection: DKSelection, market: DKMarket, propType: string): ParsedDKPlayerProp | null {
        let playerName: string;

        if (selection.participants && selection.participants.length > 0) {
            playerName = selection.participants[0].name;
            console.log(`[DraftKingsParser] Found player in participants: ${playerName}`);
        } else {
            // Fallback to label (for TD props this is correct)
            playerName = selection.label;
            console.log(`[DraftKingsParser] Using label as player name: ${playerName}`);
        }

        // Skip non-player selections
        if (!playerName || playerName === 'No Touchdown Scorer') {
            return null;
        }

        // Parse odds
        let odds: number;
        try {
            odds = this.parseAmericanOdds(selection.displayOdds.american);
        } catch (error) {
            console.error(`[DraftKingsParser] Failed to parse odds for ${playerName}:`, error);
            return null;
        }

        // TD props have no line, just single odds
        if (propType === 'anytime_td' || propType === 'first_td' || propType === '2plus_td') {
            console.log(`[DraftKingsParser] Parsing TD prop: ${playerName} ${propType} at ${selection.displayOdds.american}`);

            return {
                playerName: playerName,
                propType: propType,
                line: null,  // No line for TD props
                allOdds: [{
                    sportsbook: 'DraftKings',
                    outcomeType: propType,
                    singleOdds: odds
                }]
            };
        }

        // Yardage props - extract line from selection
        const line = this.extractLine(selection, market);
        if (line === null) {
            console.log(`[DraftKingsParser] Skipping ${playerName} - couldn't extract line`);
            return null;
        }

        // Determine if this is over or under
        const isOver = this.isOverSelection(selection);

        console.log(`[DraftKingsParser] Parsing yardage prop: ${playerName} ${propType} ${isOver ? 'O' : 'U'}${line} at ${selection.displayOdds.american}`);

        return {
            playerName: playerName,
            propType: propType,
            line: line,
            allOdds: [{
                sportsbook: 'DraftKings',
                overOdds: isOver ? odds : undefined,
                underOdds: isOver ? undefined : odds
            }]
        };
    }

    /**
     * Extract the line value from a selection
     * For DK milestone markets, this is in selection.milestoneValue or selection.metadata
     */
    private extractLine(selection: DKSelection, market: DKMarket): number | null {
        // Check for milestoneValue property (this is what DK uses)
        if ('milestoneValue' in selection) {
            const milestone = (selection as any).milestoneValue;
            if (typeof milestone === 'number') {
                console.log(`[DraftKingsParser] Found milestone value: ${milestone}`);
                return milestone;
            }
        }

        // Check in metadata
        if (selection.metadata && 'milestoneValue' in selection.metadata) {
            const milestone = (selection.metadata as any).milestoneValue;
            if (typeof milestone === 'number') {
                console.log(`[DraftKingsParser] Found milestone in metadata: ${milestone}`);
                return milestone;
            }
        }

        // Try to parse from label as fallback
        // Labels like "100+", "Under 150.5", "O 85.5"
        const match = selection.label.match(/(\d+\.?\d*)/);
        if (match) {
            const line = parseFloat(match[1]);
            console.log(`[DraftKingsParser] Extracted line from label "${selection.label}": ${line}`);
            return line;
        }

        console.log(`[DraftKingsParser] Could not extract line from selection`);
        return null;
    }
    /**
     * Determine if this selection is for "over" or "under"
     */
    private isOverSelection(selection: DKSelection): boolean {
        const label = selection.label.toLowerCase();

        // Check for explicit "over" or "under"
        if (label.includes('over') || label.includes('o ') || label.startsWith('o')) {
            return true;
        }
        if (label.includes('under') || label.includes('u ') || label.startsWith('u')) {
            return false;
        }

        // Check for "+" (means over)
        if (label.includes('+')) {
            return true;
        }

        // Default to over (milestone markets are typically "over" by default)
        console.log(`[DraftKingsParser] Defaulting to OVER for ambiguous label: "${selection.label}"`);
        return true;
    }

    /**
     * Parse DK's american odds string to integer
     */
    private parseAmericanOdds(oddsString: string): number {
        // DK uses special characters: "−110" (not standard minus)
        const cleaned = oddsString
            .replace(/−/g, '-')  // Replace special minus with standard minus
            .replace(/\+/g, '');  // Remove plus

        const parsed = parseInt(cleaned, 10);

        if (isNaN(parsed)) {
            throw new Error(`Invalid odds format: ${oddsString}`);
        }

        return parsed;
    }

    /**
     * Merge props with the same player/type/line
     * Used when combining over/under selections
     */
    mergePropOdds(props: ParsedDKPlayerProp[]): ParsedDKPlayerProp[] {
        console.log(`[DraftKingsParser] Merging ${props.length} props`);

        const merged = new Map<string, ParsedDKPlayerProp>();

        for (const prop of props) {
            const key = `${prop.playerName}|${prop.propType}|${prop.line}`;

            if (merged.has(key)) {
                // Merge odds
                const existing = merged.get(key)!;
                const newOdds = prop.allOdds[0];
                const existingOdds = existing.allOdds[0];

                // Combine over/under odds
                existing.allOdds[0] = {
                    sportsbook: 'DraftKings',
                    overOdds: existingOdds.overOdds || newOdds.overOdds,
                    underOdds: existingOdds.underOdds || newOdds.underOdds,
                    outcomeType: existingOdds.outcomeType || newOdds.outcomeType,
                    singleOdds: existingOdds.singleOdds || newOdds.singleOdds
                };

                console.log(`[DraftKingsParser] Merged odds for ${key}`);
            } else {
                merged.set(key, prop);
            }
        }

        console.log(`[DraftKingsParser] Merge complete: ${merged.size} unique props`);
        return Array.from(merged.values());
    }
}
