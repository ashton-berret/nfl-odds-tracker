interface ParsedPlayerProp {
    playerName: string;
    propType: string;
    line: number;
    bestOverOdds: number;
    bestOverSportsbook: string;
    bestUnderOdds: number;
    bestUnderSportsbook: string;
    allOdds: Array<{
        sportsbook: string;
        overOdds: number;
        underOdds: number;
    }>;
}

export function extractPlayerProp(apiResponse: any, playerName: string, propType: string): ParsedPlayerProp | null {
    console.log(`[PARSER] Extracting ${propType} for ${playerName}`);

    // init array to store odds from each sportsbook
    const allOdds: Array<{ sportsbook: string; overOdds: number; underOdds: number; }> = [];

    // access bookmakers from response
    const bookmakers = apiResponse.bookmakers;

    // loop through each bookmaker, finding the market that matches the arg propType
    for (const bookmaker of bookmakers) {
        console.log(`[PARSER] Checking bookmaker: ${bookmaker.title}`);

        const market = bookmaker.markets.find(m => m.key === propType);

        if (!market) {
            console.log(`[PARSED] ${bookmaker.title} doesn't hve ${propType}`);
            continue;
        }

        const overOutcome = market.outcomes.find(outcome => outcome.description === playerName && outcome.name === "Over");
        const underOutcome = market.outcomes.find(outcome => outcome.description === playerName && outcome.name === "Under");

        if (overOutcome && underOutcome) {
            console.log(`[PARSER] Found ${playerName} at ${bookmaker.title}`);

            allOdds.push({
                sportsbook: bookmaker.title,
                overOdds: overOutcome.price,
                underOdds: underOutcome.price
            });
        }
    }

    if (allOdds.length === 0) {
        console.log(`[PARSER] No odds found for ${playerName} ${propType}`);
        return null;  // Player not found in any sportsbook
    }

    // find the best odds (american odds => best means closest to 0)
    let bestOverOdds = allOdds[0].overOdds;
    let bestOverSportsbook = allOdds[0].sportsbook;
    let bestUnderOdds = allOdds[0].underOdds;
    let bestUnderSportsbook = allOdds[0].sportsbook;

    for (const odds of allOdds) {
        if (odds.overOdds > bestOverOdds) {
            bestOverOdds = odds.overOdds;
            bestOverSportsbook = odds.sportsbook;
        }

        if (odds.underOdds > bestUnderOdds) {
            bestUnderOdds = odds.underOdds;
            bestUnderSportsbook = odds.sportsbook;
        }
    }

    //const line = allOdds.length > 0 ? bookmakers.find(b => b.markets.find(m => m.key === propType))?.markets.find(m => m.key === propType)?.outcomes.find(o => o.description === playerName)?.point || 0 : 0;
    let line = 0;

    if (allOdds.length > 0) {
        const bookmaker = bookmakers.find(b => b.markets.find(m => m.key === propType));

        const market = bookmaker?.markets.find(m => m.key === propType);
        const outcome = market?.outcomes.find(o => o.description === playerName);

        line = outcome?.point ?? 0;
    }

    console.log(`[PARSER] Best over: ${bestOverSportsbook} at ${bestOverOdds}`);
    console.log(`[PARSER] Best under: ${bestUnderSportsbook} at ${bestUnderOdds}`);

    return {
        playerName,
        propType,
        line,
        bestOverOdds,
        bestOverSportsbook,
        bestUnderOdds,
        bestUnderSportsbook,
        allOdds
    };
}


export function extractAllPlayerProps(apiResponse: any): ParsedPlayerProp[] {
    console.log('[PARSER] Extracting all player props from game');

    const allParsedProps: ParsedPlayerProp[] = [];
    const seen = new Set<string>();

    const bookmakers = apiResponse.bookmakers;

    for (const bookmaker of bookmakers) {
        for (const market of bookmaker.markets) {
            if (!market.key.startsWith("player_")) {
                continue;
            }

            for (const outcome of market.outcomes) {
                // only process over outcomes since both get processed in the function call
                if (outcome.name !== "Over") {
                    continue;
                }

                const playerName = outcome.description;
                const propType = market.key;
                const key = `${playerName}|${propType}`;

                if (seen.has(key)) {
                    continue;
                }

                const res = extractPlayerProp(apiResponse, playerName, propType);

                if (res) {
                    allParsedProps.push(res);
                    seen.add(key);
                }
            }
        }
    }
    console.log(`[PARSER] Extracted ${allParsedProps.length} unique player props`);
    return allParsedProps;
}
