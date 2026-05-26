
import { Player, PlayerRole, TeamData, Ground, Match, PlayerStats, NewsArticle, Format, Sponsorship } from './types';
import { getAllExtraPlayers } from './utils/playerRegistry';

export const MAX_SQUAD_SIZE = 18;
export const MIN_SQUAD_SIZE = 12;
export const MAX_FOREIGN_PLAYERS = 5;

export const BRANDS = [
    { name: "Sike's", color: "text-yellow-500", style: "font-extrabold tracking-tight font-display", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>' },
    { name: "Signify", color: "text-cyan-400", style: "font-sans tracking-widest uppercase", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>' },
    { name: "Malik", color: "text-red-600", style: "font-serif italic font-bold", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.06 9.02l.92.92L3.92 21h16.16V23H3a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h1V9.02zM12 3a2 2 0 0 1 2 2v4h-4V5a2 2 0 0 1 2-2z"/></svg>' },
    { name: "G.S", color: "text-green-500", style: "font-mono font-bold", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>' }
];

export const TV_CHANNELS = [
    { id: 'tv-prime', name: 'PrimeCast Ultra', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="12" r="4" fill="white" fill-opacity="0.3"/><path d="M10 9l5 3-5 3V9z" fill="white"/></svg>', color: 'text-purple-500', minPopularity: 40, tier: 'Premium' },
    { id: 'tv-roar', name: 'Roar Sports', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z"/></svg>', color: 'text-red-600', minPopularity: 55, tier: 'Premium' },
    { id: 'tv-now', name: 'CricketNow HD', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4z"/><path d="M8 10h8v4H8z" fill="white"/></svg>', color: 'text-blue-500', minPopularity: 30, tier: 'Standard' },
    { id: 'tv-sig', name: 'Signify TV', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12h20M2 12l10-9 10 9M2 12l10 9 10-9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>', color: 'text-cyan-400', minPopularity: 50, tier: 'Premium' },
];

export const TOURNAMENT_LOGOS = [
    { id: 'cup-1', name: 'Classic Cup', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 2h14a1 1 0 0 1 1 1v4a3 3 0 0 1-3 3h-1v2h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3v3h2a1 1 0 0 1 1 1v1H6v-1a1 1 0 0 1 1-1h2v-3H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h2v-2H7a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1z"/></svg>' },
    { id: 'shield-1', name: 'Grand Shield', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' },
];

export const SPONSOR_THRESHOLDS = {
    [Format.T20]: { "Sike's": 40, "Signify": 35, "Malik": 30, "G.S": 25 },
    [Format.ODI]: { "Sike's": 45, "Signify": 40, "Malik": 30, "G.S": 25 },
    [Format.SHIELD]: { "Sike's": 40, "Signify": 35, "Malik": 30, "G.S": 25 },
};

export const INITIAL_SPONSORSHIPS: Record<Format, Sponsorship> = {
    [Format.T20]: { sponsorName: "Sike's", tournamentName: "Super Smash 26", logoColor: "text-yellow-500", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: "CricketNow HD", tvLogo: "" },
    [Format.ODI]: { sponsorName: "Signify", tournamentName: "Pro Cup 26", logoColor: "text-cyan-400", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: "Signify TV", tvLogo: "" },
    [Format.SHIELD]: { sponsorName: "Malik", tournamentName: "Shield 26", logoColor: "text-red-600", tournamentLogo: TOURNAMENT_LOGOS[1].svg, tvChannel: "PrimeCast Ultra", tvLogo: "" },
};

export const TEAMS: TeamData[] = [
  { id: 'team1', name: 'Kings', homeGround: 'KCG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5 L95 25 L95 75 L50 95 L5 75 L5 25 Z" fill="#FBBF24" stroke="#B45309" stroke-width="4"/><path d="M50 30 l-15 40 l30 0 l-15 -40" fill="#FFFFFF"/><circle cx="50" cy="22" r="6" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'team2', name: 'Stars', homeGround: 'SG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#10B981" stroke="#065F46" stroke-width="4"/><path d="M50 20 L58 40 L80 40 L62 55 L68 75 L50 62 L32 75 L38 55 L20 40 L42 40 Z" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'team3', name: 'Sixers', homeGround: 'TG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="20" fill="#EC4899" stroke="#831843" stroke-width="4"/><text x="50" y="65" font-family="Arial" font-size="50" font-weight="bold" fill="#FFFFFF" text-anchor="middle">6</text></svg>', isYouthTeam: false },
  { id: 'team4', name: 'Gladiators', homeGround: 'LWG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 20 H80 L80 60 Q50 95 20 60 Z" fill="#8B5CF6" stroke="#4C1D95" stroke-width="4"/></svg>', isYouthTeam: false },
  { id: 'team5', name: 'Eagles', homeGround: 'MCG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#3B82F6" stroke="#1E3A8A" stroke-width="4"/></svg>', isYouthTeam: false },
  { id: 'team6', name: 'Hawks', homeGround: 'HGG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5 L95 25 L95 75 L50 95 L5 75 L5 25 Z" fill="#F97316" stroke="#7C2D12" stroke-width="4"/></svg>', isYouthTeam: false },
];

export const GROUNDS: Ground[] = [
  { name: "Keenjhur Cricket Ground", code: "KCG", pitch: "Balanced Sporting Pitch", dimensions: "70m / 68m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Fast", capacity: 25000 },
  { name: "School Ground", code: "SG", pitch: "Dusty Spinner’s Haven", dimensions: "62m / 60m", weather: "Dry", boundarySize: "Small", outfieldSpeed: "Slow", capacity: 5000 },
  { name: "Transformer Ground", code: "TG", pitch: "Green Top", dimensions: "75m / 72m", weather: "Overcast", boundarySize: "Large", outfieldSpeed: "Medium", capacity: 12000 },
  { name: "Lake Way Ground", code: "LWG", pitch: "Batting Paradise", dimensions: "65m / 65m", weather: "Sunny", boundarySize: "Small", outfieldSpeed: "Lightning", capacity: 18000 },
  { name: "Home Gate Ground", code: "HGG", pitch: "Dead Slow Track", dimensions: "68m / 68m", weather: "Humid", boundarySize: "Medium", outfieldSpeed: "Slow", capacity: 8000 },
  { name: "Mosque Cricket Ground", code: "MCG", pitch: "Cracked Worn Surface", dimensions: "72m / 70m", weather: "Dry", boundarySize: "Large", outfieldSpeed: "Medium", capacity: 15000 },
];

export const PITCH_TYPES = [ "Balanced Sporting Pitch", "Dusty Spinner’s Haven", "Green Top", "Batting Paradise", "Dead Slow Track", "Cracked Worn Surface" ];

export const generateSingleFormatInitialStats = (): PlayerStats => {
    const phaseStats = {
        batting: {
            pp: { runs: 0, balls: 0, dismissals: 0 },
            mo: { runs: 0, balls: 0, dismissals: 0 },
            do: { runs: 0, balls: 0, dismissals: 0 }
        },
        bowling: {
            pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
        }
    };

    const positionStats: Record<number, { innings: number; runs: number; balls: number; dismissals: number; thirties: number; fifties: number; hundreds: number }> = {};
    for (let pos = 1; pos <= 11; pos++) {
        positionStats[pos] = { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 };
    }

    return {
        matches: 0, 
        inningsBatting: 0,
        inningsBowling: 0,
        runs: 0, highestScore: 0, average: 0, strikeRate: 0, ballsFaced: 0, dismissals: 0,
        hundreds: 0, fifties: 0, thirties: 0, fours: 0, sixes: 0, fastestFifty: 0, fastestHundred: 0,
        wickets: 0, economy: 0, bestBowling: '-', bestBowlingWickets: 0, bestBowlingRuns: 0,
        bowlingAverage: 0, ballsBowled: 0, runsConceded: 0, threeWicketHauls: 0, fiveWicketHauls: 0,
        catches: 0, runOuts: 0, manOfTheMatchAwards: 0,
        phaseStats,
        positionStats
    };
};

export const generateInitialStats = (): { [key in Format]: PlayerStats } => {
    const stats: any = {};
    Object.values(Format).forEach(f => stats[f] = generateSingleFormatInitialStats());
    return stats;
};

// --- RAW PLAYER DATA (2026 EDITION) ---
export const PLAYERS: Player[] = getAllExtraPlayers();

export const PRE_BUILT_SQUADS: Record<string, string[]> = {
  'team1': [
    'int-au-1', 'int-au-2', 'int-au-3', 'wk-1', 'ar-1', 'ar-2', 'sb-1', 'sb-2', 'bl-1', 'bl-2', 'bl-3', 'bt-1', 'bt-2', 'bt-3', 'bt-4', 'bt-5'
  ],
  'team2': [
    'int-au-4', 'int-au-5', 'int-au-6', 'wk-2', 'ar-3', 'ar-4', 'sb-3', 'sb-4', 'bl-4', 'bl-5', 'bl-6', 'bt-6', 'bt-7', 'bt-8', 'bt-9', 'bt-10'
  ],
  'team3': [
    'int-au-7', 'int-au-8', 'int-au-10', 'wk-3', 'ar-5', 'ar-6', 'sb-5', 'sb-6', 'bl-7', 'bl-8', 'bl-9', 'bt-11', 'bt-12', 'bt-13', 'bt-14', 'bt-15'
  ],
  'team4': [
    'int-nz-4', 'int-nz-5', 'int-wi-3', 'wk-4', 'ar-7', 'ar-8', 'sb-7', 'sb-8', 'bl-10', 'bl-11', 'bl-12', 'bt-16', 'bt-17', 'bt-18', 'bt-19', 'bt-20'
  ],
  'team5': [
    'int-sl-1', 'int-sa-1', 'int-en-1', 'wk-5', 'ar-9', 'ar-10', 'sb-9', 'sb-10', 'bl-13', 'bl-14', 'bl-15', 'bt-21', 'bt-22', 'bt-23', 'bt-24', 'bt-25'
  ],
  'team6': [
    'int-wi-1', 'int-sl-2', 'int-en-2', 'wk-6', 'ar-11', 'ar-12', 'sb-11', 'sb-12', 'bl-16', 'bl-17', 'bl-18', 'bt-26', 'bt-27', 'bt-28', 'bt-29', 'bt-30'
  ],
};

export const INITIAL_NEWS: NewsArticle[] = [
    { id: 'n1', headline: "Season 26 Auction Concluded!", date: "28 Jun 2025", excerpt: "Teams have finalized their 18-man core squads.", content: "The hammer has fallen. Franchises have spent big to secure a mix of local grit and foreign flair. Minimum 15 player rule was strictly enforced.", type: 'league' },
    { id: 'n2', headline: "Triple Format Challenge 26", date: "29 Jun 2025", excerpt: "Teams brace for T20, One-Day, and Shield formats.", content: "Consistency will be key. The season opens with T20, followed by One-Day, and concluding with the multi-day Shield.", type: 'league' },
    { id: 'n3', headline: "Global Stars Arrive", date: "30 Jun 2025", excerpt: "Haddin, Warner, Sprike and others touch down.", content: "The foreign contingent has arrived. With only 3 foreign slots per team, the pressure is on the international stars to perform.", type: 'league' },
];

export const NEWS_ARTICLES = INITIAL_NEWS;
