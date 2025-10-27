// User types
export type User = {
    id: number;
    username: string;
    email: string;
    balance: number;
    createdAt: Date;
};

// Prop types
export type PropOdds = {
    sportsbook: string;
    overOdds: number;
    underOdds: number;
};

export type Prop = {
    id: number;
    playerName: string;
    propType: string;
    line: number;
    bestOverOdds: number;
    bestUnderOdds: number;
    bestOverSportsbook: string;
    bestUnderSportsbook: string;
    allOdds: PropOdds[];
    game: {
        homeTeam: string;
        awayTeam: string;
        commenceTime: string;
    };
};

// Bet types
export type Bet = {
    id: number;
    amount: number;
    odds: number;
    side: string;
    status: string;
    profit: number | null;
    placedAt: Date;
    settledAt: Date | null;
    player: string;
    propType: string;
    line: number;
    game: string;
    commenceTime: Date;
    sportsbook: string;
};

// Stats types
export type BettingStats = {
    totalBets: number;
    wonBets: number;
    lostBets: number;
    pendingBets: number;
    winRate: string;
    totalProfit: number;
};
