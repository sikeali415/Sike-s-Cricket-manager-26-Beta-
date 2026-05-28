
export enum Format {
    T20 = 'Premier T20 League',
    ODI = 'Premier One-Day Cup',
    SHIELD = 'Premier First-Class Shield'
}

export enum PlayerRole {
    BATSMAN = 'BT',
    WICKET_KEEPER = 'WK',
    ALL_ROUNDER = 'AR',
    SPIN_BOWLER = 'SB',
    FAST_BOWLER = 'BL',
}

export type BattingStyle = 'A' | 'D' | 'N' | 'NA';
export type Strategy = 'defensive' | 'balanced' | 'attacking' | 'blitzkrieg';
export type AppState = 'MAIN_MENU' | 'TEAM_SELECTION' | 'AUCTION' | 'CAREER_HUB';
export type CareerScreen = 'DASHBOARD' | 'LEAGUES' | 'LINEUPS' | 'EDITOR' | 'NEWS' | 'STATS' | 'SETTINGS' | 'PLAYER_PROFILE' | 'MATCH_RESULT' | 'FORWARD_RESULTS' | 'AWARDS_RECORDS' | 'TRANSFERS' | 'END_OF_FORMAT' | 'COMPARISON' | 'SCHEDULE' | 'LIVE_MATCH' | 'SPONSOR_ROOM' | 'CUSTOMIZATION' | 'SELECT_PLAYER_FOR_COMPARISON_SLOT_1' | 'SELECT_PLAYER_FOR_COMPARISON_SLOT_2' | 'AUCTION_ROOM' | 'RETENTION' | 'PLAYER_DATABASE';

export interface PlayerStats {
    matches: number; 
    inningsBatting: number;
    inningsBowling: number;
    runs: number; highestScore: number; average: number; strikeRate: number; ballsFaced: number; dismissals: number;
    hundreds: number; fifties: number; thirties: number; fours: number; sixes: number; fastestFifty: number; fastestHundred: number;
    wickets: number; economy: number; bestBowling: string; bestBowlingWickets: number; bestBowlingRuns: number; bowlingAverage: number;
    ballsBowled: number; runsConceded: number; threeWicketHauls: number; fiveWicketHauls: number; catches: number; runOuts: number;
    manOfTheMatchAwards: number;
    phaseStats?: {
        batting: {
            pp: { runs: number; balls: number; dismissals: number };
            mo: { runs: number; balls: number; dismissals: number };
            do: { runs: number; balls: number; dismissals: number };
        };
        bowling: {
            pp: { wickets: number; runsConceded: number; ballsBowled: number };
            mo: { wickets: number; runsConceded: number; ballsBowled: number };
            do: { wickets: number; runsConceded: number; ballsBowled: number };
        };
    };
    positionStats?: Record<number, {
        innings: number;
        runs: number;
        balls: number;
        dismissals: number;
        thirties: number;
        fifties: number;
        hundreds: number;
    }>;
}

export interface PlayerInjury {
    durationType: 'matches' | 'seasons';
    durationValue: number;
    text: string;
}

export type BowlingSubType = 'ls' | 'os' | 'lals' | 'laos' | 'lac' | 'mv' | 'fb' | 'fbs' | 'm' | 'none';

export interface Player {
    id: string; name: string; age: number; nationality: string; role: PlayerRole; battingSkill: number; secondarySkill: number;
    style: BattingStyle; isOpener: boolean; isForeign: boolean; teamName?: string;
    customProfiles?: { [key in Format]?: { avg: number; sr: number } };
    stats: Record<Format, PlayerStats>;
    seasonStats?: Record<number, Record<Format, PlayerStats>>;
    injury?: PlayerInjury | null;
    badges?: string[];
    healthStatus?: 'fit' | 'injured' | 'temporary_fit';
    injuryType?: string | null;
    injuryMatchesRemaining?: number;
    injurySeasonsRemaining?: number;
    fitness?: number;
    basePrice?: number;
    bowlingSubType?: BowlingSubType;
    weaknesses?: BowlingSubType[];
    isFinisher?: boolean;
    isPowerHitter?: boolean;
    traits?: string[];
}

export interface Team {
    id: string; name: string; squad: Player[]; captains: { [key in Format]?: string };
    purse: number; // In PKR Crore (stored as number, e.g., 50.0)
    firstAidKits?: number;
    firstAidAvailable?: boolean;
    captainId?: string | null;
}

export interface TeamData {
    id: string; name: string; homeGround: string; logo: string; isYouthTeam: boolean;
}

export interface Ground {
    name: string; code: string; pitch: string; dimensions?: string; weather?: 'Sunny' | 'Overcast' | 'Rainy' | 'Humid' | 'Dry';
    boundarySize?: 'Small' | 'Medium' | 'Large'; outfieldSpeed?: 'Fast' | 'Medium' | 'Slow' | 'Lightning'; capacity?: number;
}

export interface Match {
    matchNumber: number | string; teamA: string; teamAId?: string; vs: string; teamB: string; teamBId?: string; date: string; group: 'Round-Robin' | 'Semi-Finals' | 'Final';
}

export interface Inning {
    teamId: string; teamName: string; score: number; wickets: number; overs: string; batting: BattingPerformance[]; bowling: BowlingPerformance[]; extras: number; recentBalls?: string[];
    ppRuns?: number; ppWickets?: number; ppBalls?: number; ppDots?: number; ppFours?: number; ppSixes?: number;
    moRuns?: number; moWickets?: number; moBalls?: number; moDots?: number; moFours?: number; moSixes?: number;
    doRuns?: number; doWickets?: number; doBalls?: number; doDots?: number; doFours?: number; doSixes?: number;
    [key: string]: any;
}

export interface BattingPerformance {
    playerId: string; playerName: string; runs: number; balls: number; fours: number; sixes: number; isOut: boolean; dismissalText: string; dismissal: { type: 'not out' | 'bowled' | 'caught'; bowlerId: string; fielderId?: string; }; ballsToFifty?: number; ballsToHundred?: number;
    ppRuns?: number; ppBalls?: number; ppDismissals?: number;
    moRuns?: number; moBalls?: number; moDismissals?: number;
    doRuns?: number; doBalls?: number; doDismissals?: number;
    battingPosition?: number;
    injury?: PlayerInjury | null; healthStatus?: 'fit' | 'injured' | 'temporary_fit';
}

export interface BowlingPerformance {
    playerId: string; playerName: string; overs: string; maidens: number; runsConceded: number; wickets: number; ballsBowled: number;
    ppWickets?: number; ppRunsConceded?: number; ppBallsBowled?: number;
    moWickets?: number; moRunsConceded?: number; moBallsBowled?: number;
    doWickets?: number; doRunsConceded?: number; doBallsBowled?: number;
    injury?: PlayerInjury | null; healthStatus?: 'fit' | 'injured' | 'temporary_fit';
}

export interface MatchResult {
    matchNumber: number | string; winnerId: string | null; loserId: string | null; isDraw?: boolean; summary: string; firstInning: Inning; secondInning: Inning; thirdInning?: Inning; fourthInning?: Inning; manOfTheMatch: { playerId: string; playerName: string; teamId: string; summary: string; }; tossWinnerId?: string; tossDecision?: 'bat' | 'bowl';
}

export interface Standing {
    teamId: string; teamName: string; played: number; won: number; lost: number; drawn: number; points: number; netRunRate: number; runsFor?: number; runsAgainst?: number;
}

export interface NewsArticle {
    id: string; headline: string; date: string; excerpt: string; content: string; type?: 'match' | 'transfer' | 'league' | 'squad';
}

export interface Award {
    season: number; format: Format; winnerTeamId: string; winnerTeamName: string;
    playerOfSeason?: { playerId: string, playerName: string, teamName: string, impact: number };
    bestBatter: { playerId: string, playerName: string, teamName: string, runs: number };
    bestBowler: { playerId: string, playerName: string, teamName: string, wickets: number };
    powerHitter?: { playerId: string, playerName: string, teamName: string, sixes: number };
}

export interface ScoreLimits { maxRuns?: number; maxWickets?: number; }
export type InningLimits = { [key: number]: ScoreLimits; };

export interface BatterVsBowlerRecord { batterId: string; batterName: string; bowlerId: string; bowlerName: string; runs: number; balls: number; dismissals: number; }
export interface TeamVsTeamRecord { teamAId: string; teamBId: string; teamAName: string; teamBName: string; matches: number; teamAWins: number; }
export interface PlayerVsTeamRecord { playerId: string; playerName: string; playerRole: PlayerRole; vsTeamId: string; vsTeamName: string; runs: number; balls: number; dismissals: number; wickets: number; runsConceded: number; ballsBowled: number; }
export interface PromotionRecord { season: number; promotedTeamId: string; promotedTeamName: string; relegatedTeamId: string; relegatedTeamName: string; }

export interface Sponsorship { sponsorName: string; tournamentName: string; logoColor: string; tournamentLogo?: string; tvChannel?: string; tvLogo?: string; }
export interface Brand { name: string; color: string; style: string; logo: string; }
export interface TVChannel { id: string; name: string; logo: string; color: string; minPopularity: number; tier: 'Premium' | 'Standard' | 'Budget'; }

export interface GameData {
    userTeamId: string; teams: Team[]; grounds: Ground[]; allTeamsData: TeamData[]; allPlayers: Player[]; schedule: Record<Format, Match[]>; currentMatchIndex: Record<Format, number>; standings: Record<Format, Standing[]>; matchResults: Record<Format, MatchResult[]>; playingXIs: Record<string, Partial<Record<Format, string[]>>>; currentSeason: number; currentFormat: Format; awardsHistory: Award[]; records: { batterVsBowler: BatterVsBowlerRecord[]; teamVsTeam: TeamVsTeamRecord[]; playerVsTeam: PlayerVsTeamRecord[]; }; promotionHistory: PromotionRecord[]; popularity: number; sponsorships: Record<Format, Sponsorship>; news: NewsArticle[]; activeMatch: LiveMatchState | null; scoreLimits?: Record<string, Partial<Record<Format, InningLimits>>>; availableBrands?: Brand[]; availableTVChannels?: TVChannel[];
    settings: {
        isDoubleRoundRobin: boolean;
    };
}

export interface LiveMatchState {
    status: 'toss' | 'post_toss' | 'ready' | 'inprogress' | 'inning_break' | 'completed';
    match: Match;
    currentInningIndex: number;
    innings: Inning[];
    target: number | null;
    currentBatters: { strikerId: string; nonStrikerId: string };
    currentBowlerId: string;
    lastBallSpeed?: number;
    ballByBallId?: string;
    recentBalls: string[];
    commentary: string[]; 
    battingTeam: Team; 
    bowlingTeam: Team; 
    requiredRunRate: number; 
    currentPartnership: { runs: number, balls: number }; 
    fallOfWickets: { score: number, wicket: number, over: string, player: string }[]; 
    waitingFor: 'openers' | 'batter' | 'bowler' | 'batter_arrival' | 'bowler_change' | null; 
    strategies: { batting: Record<string, Strategy>; bowling: Strategy; }; 
    playSafeAgainst?: Record<string, string[]>; // batterId -> list of bowlerIds
    isExploitingWeakness?: boolean;
    autoPlayType: 'regular' | 'inning' | 'match' | null; 
    tossWinnerId: string | null; 
    tossDecision: 'bat' | 'bowl' | null;
    winId?: string;
    milestoneEvent?: {
        title: string;
        message: string;
        type: 'batting' | 'bowling' | 'career' | 'leader' | 'match_winner';
        playerId: string;
    } | null;
}

export interface Message { id: string; text: string; sender: 'user' | 'model' | 'bot'; timestamp?: Date; }
