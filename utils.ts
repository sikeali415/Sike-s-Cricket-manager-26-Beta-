import React from 'react';
import { Format, Player, PlayerRole, Team, Match, PlayerStats, Sponsorship, MatchResult, NewsArticle, GameData, Standing, BowlingSubType } from './types';
import { BRANDS, SPONSOR_THRESHOLDS, generateSingleFormatInitialStats, TV_CHANNELS, TOURNAMENT_LOGOS } from './data';

export type Category = 'T20' | 'List A' | 'First Class';

export const getFormatsForCategory = (cat: Category): Format[] => {
    switch(cat) {
        case 'T20': return [Format.T20];
        case 'List A': return [Format.ODI];
        case 'First Class': return [Format.SHIELD];
        default: return [Format.T20];
    }
};

export const resolveMatch = (match: Match, gameData: GameData, format: Format) => {
    let resolvedMatch = { ...match };
    if (resolvedMatch.group !== 'Round-Robin') {
        const standings = gameData.standings[format] || [];
        const getTeamName = (pos: number) => standings.length >= pos ? standings[pos - 1]?.teamName : `TBD`;
        
        const resolvePlaceholder = (placeholder: string) => {
            if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                return getTeamName(parseInt(placeholder[0], 10));
            }
            if (placeholder.startsWith('SF')) {
                const sfMatchNumber = placeholder.split(' ')[0];
                const sfResult = gameData.matchResults[format]?.find(r => r.matchNumber === sfMatchNumber);
                if (sfResult?.winnerId) {
                    return gameData.teams.find(t => t.id === sfResult.winnerId)?.name || 'TBD';
                }
                return `Winner of ${sfMatchNumber}`;
            }
            return placeholder;
        };
        resolvedMatch.teamA = resolvePlaceholder(resolvedMatch.teamA);
        resolvedMatch.teamB = resolvePlaceholder(resolvedMatch.teamB);
    }
    return resolvedMatch;
};

export const PITCH_MODIFIERS = {
  "Balanced Sporting Pitch": { [Format.T20]: { runRate: 3.85, wicketChance: 1.20 }, [Format.ODI]: { runRate: 2.45, wicketChance: 1.15 }, [Format.SHIELD]: { runRate: 1.0, wicketChance: 1.0 }, paceBonus: 0, spinBonus: 0, chasePenalty: 1.0, deterioration: 0.02, unpredictability: 0 },
  "Dusty Spinner’s Haven": { [Format.T20]: { runRate: 3.10, wicketChance: 1.40 }, [Format.ODI]: { runRate: 2.10, wicketChance: 1.25 }, [Format.SHIELD]: { runRate: 0.9, wicketChance: 1.15 }, paceBonus: -0.05, spinBonus: 0.15, chasePenalty: 0.95, deterioration: 0.1, unpredictability: 0.005 },
  "Green Top": { [Format.T20]: { runRate: 3.30, wicketChance: 1.45 }, [Format.ODI]: { runRate: 2.20, wicketChance: 1.30 }, [Format.SHIELD]: { runRate: 0.85, wicketChance: 1.2 }, paceBonus: 0.15, spinBonus: -0.05, chasePenalty: 1.0, deterioration: 0.05, unpredictability: 0 },
  "Batting Paradise": { [Format.T20]: { runRate: 4.40, wicketChance: 1.0 }, [Format.ODI]: { runRate: 2.85, wicketChance: 1.0 }, [Format.SHIELD]: { runRate: 1.2, wicketChance: 0.85 }, paceBonus: 0, spinBonus: 0, chasePenalty: 1.0, deterioration: 0, unpredictability: 0 },
  "Dead Slow Track": { [Format.T20]: { runRate: 2.75, wicketChance: 1.30 }, [Format.ODI]: { runRate: 2.0, wicketChance: 1.20 }, [Format.SHIELD]: { runRate: 0.8, wicketChance: 1.1 }, paceBonus: -0.05, spinBonus: 0.1, chasePenalty: 1.0, deterioration: 0.05, unpredictability: 0 },
  "Cracked Worn Surface": { [Format.T20]: { runRate: 3.30, wicketChance: 1.40 }, [Format.ODI]: { runRate: 2.20, wicketChance: 1.30 }, [Format.SHIELD]: { runRate: 0.75, wicketChance: 1.25 }, paceBonus: 0.05, spinBonus: 0.1, chasePenalty: 0.98, deterioration: 0.15, unpredictability: 0.015 },
};

export const COMMENTARY_TEMPLATES = {
    '0': ["Defended solidly back to the bowler.", "No run, straight to the fielder.", "Beaten! Lovely delivery.", "Leaves it alone outside off.", "Solid defense, respects the good ball."],
    '1': ["Pushed into the gap for a single.", "Quick single taken.", "Worked away to square leg for one.", "Edged but safe, they take a run.", "Tapped to mid-on for a sharp single."],
    '2': ["Driven through covers, they'll come back for two.", "Good running, two runs added.", "Flicked away, easy couple.", "Punched off the back foot for a brace."],
    '3': ["Great placement! They push hard for three.", "Stopped just inside the boundary, three runs saved.", "Timed well, but the outfield is slow. Three runs."],
    '4': ["FOUR! Glorious shot through the covers!", "Smashed down the ground for FOUR!", "Edged and four! Lucky boundary.", "FOUR! Pulled away with power.", "Beautiful drive, races to the fence for FOUR!"],
    '6': ["SIX! That's huge! Out of the ground!", "SIX! Clean strike over long-on!", "Maximum! He's picked the length early.", "Top edge... and it flies for SIX!", "Launched into the stands! massive hit!"],
    'W': ["OUT! Clean bowled! What a delivery!", "Caught! Straight to the fielder.", "LBW! That looked plumb.", "Run out! Mix up in the middle!", "Edged and taken! The keeper makes no mistake."],
    'Wd': ["Wide ball, too far outside off.", "Drifting down leg, called wide.", "Wayward delivery, signaled wide."],
    'Nb': ["No ball! Overstepping.", "No ball for height, free hit coming up."],
};

export const getCommentary = (runs: number, isOut: boolean, batterName: string, bowlerName: string, extraType?: string) => {
    if (isOut) {
        const templates = COMMENTARY_TEMPLATES['W'];
        return templates[Math.floor(Math.random() * templates.length)].replace('The keeper', 'The keeper').replace('fielder', 'fielder');
    }
    if (extraType === 'Wd') return COMMENTARY_TEMPLATES['Wd'][Math.floor(Math.random() * COMMENTARY_TEMPLATES['Wd'].length)];
    if (extraType === 'Nb') return COMMENTARY_TEMPLATES['Nb'][Math.floor(Math.random() * COMMENTARY_TEMPLATES['Nb'].length)];

    const key = runs > 6 ? '6' : runs.toString() as keyof typeof COMMENTARY_TEMPLATES;
    const templates = COMMENTARY_TEMPLATES[key] || COMMENTARY_TEMPLATES['0'];
    return templates[Math.floor(Math.random() * templates.length)];
};

export const getRoleColor = (role: PlayerRole) => {
  switch (role) {
    case PlayerRole.BATSMAN: return 'text-blue-500 dark:text-blue-400';
    case PlayerRole.WICKET_KEEPER: return 'text-green-600 dark:text-green-400';
    case PlayerRole.ALL_ROUNDER: return 'text-yellow-600 dark:text-yellow-400';
    case PlayerRole.SPIN_BOWLER: return 'text-purple-600 dark:text-purple-400';
    case PlayerRole.FAST_BOWLER: return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};

export const getRoleFullName = (role: PlayerRole) => {
    switch (role) {
        case PlayerRole.BATSMAN: return 'Batsman';
        case PlayerRole.WICKET_KEEPER: return 'Wicket-Keeper';
        case PlayerRole.ALL_ROUNDER: return 'All-Rounder';
        case PlayerRole.SPIN_BOWLER: return 'Spin Bowler';
        case PlayerRole.FAST_BOWLER: return 'Bowler';
        default: return 'Player';
    }
};

export const getBattingStyleLabel = (style: string) => {
    switch (style) {
        case 'A': return 'Aggressive';
        case 'D': return 'Defensive';
        case 'N': return 'Balanced';
        case 'NA': return 'N/A';
        default: return style;
    }
};

export const BATTING_STYLE_OPTIONS = ['A', 'D', 'N', 'NA'];

export const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
}

export const getPlayerById = (id: string, allPlayers: Player[]) => {
    const player = allPlayers.find(p => p.id === id);
    if (!player) {
      return { id: 'unknown', name: 'Unknown Player', role: PlayerRole.BATSMAN, battingSkill: 30, secondarySkill: 30, style: 'N' } as any as Player;
    }
    return player;
};

export const generateAutoXI = (squad: Player[], format: Format) => {
    // Filter healthy players
    const activeSquad = squad.filter(p => !p.injury).length >= 11 ? squad.filter(p => !p.injury) : squad;
    const xi: Player[] = [];
    const selectedIds = new Set<string>();
    
    // Maximum 3 foreign players allowed in T20 Playing XI, 0 allowed in domestic formats (ODI/Shield)
    const maxForeignAllowed = format === Format.T20 ? 3 : 0;
    let foreignInXI = 0;

    const addPlayer = (p: Player) => {
        if (selectedIds.has(p.id)) return false;
        if (p.isForeign && foreignInXI >= maxForeignAllowed) return false;
        
        xi.push(p);
        selectedIds.add(p.id);
        if (p.isForeign) foreignInXI++;
        return true;
    };

    // 1. Minimum 1 Wicket Keeper
    const keepers = activeSquad.filter(p => p.role === PlayerRole.WICKET_KEEPER).sort((a,b) => b.battingSkill - a.battingSkill);
    if (keepers.length > 0) addPlayer(keepers[0]);

    // 2. Minimum 4 Proper Batters
    const batters = activeSquad.filter(p => p.role === PlayerRole.BATSMAN).sort((a,b) => b.battingSkill - a.battingSkill);
    batters.slice(0, 4).forEach(p => addPlayer(p));

    // 3. Minimum 1 All-rounder
    const ars = activeSquad.filter(p => p.role === PlayerRole.ALL_ROUNDER).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    if (ars.length > 0) addPlayer(ars[0]);

    // 4. Minimum 3 Proper Bowlers (Fast/Spin)
    const bowlers = activeSquad.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER).sort((a,b) => b.secondarySkill - a.secondarySkill);
    bowlers.slice(0, 3).forEach(p => addPlayer(p));

    // Fill to 11 ensuring Maximum 5 Bowlers constraint
    // Current count: 1 WK + 4 BT + 1 AR + 3 BL = 9 players.
    // We need 2 more. 
    // Constrain: Max 5 bowlers. We already have 3 Proper Bowlers. We can add at most 2 more proper bowlers.
    
    const remainingCount = 11 - xi.length;
    if (remainingCount > 0) {
        const others = activeSquad.filter(p => !selectedIds.has(p.id))
            .sort((a,b) => {
                const aSkill = Math.max(a.battingSkill, a.secondarySkill);
                const bSkill = Math.max(b.battingSkill, b.secondarySkill);
                return bSkill - aSkill;
            });

        for (const p of others) {
            if (xi.length >= 11) break;
            
            // Check max 5 bowlers constraint (Proper Bowlers)
            const currentBowlers = xi.filter(px => px.role === PlayerRole.FAST_BOWLER || px.role === PlayerRole.SPIN_BOWLER).length;
            const isProperBowler = p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER;
            
            if (isProperBowler && currentBowlers >= 5) continue;
            
            addPlayer(p);
        }
    }

    // Emergency fill if rules were too strict (e.g. not enough non-bowlers)
    if (xi.length < 11) {
        const emergencyPool = activeSquad.filter(p => !selectedIds.has(p.id)).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
        emergencyPool.forEach(p => { if (xi.length < 11) addPlayer(p); });
    }

    return xi.slice(0, 11);
};

export const getBatterTier = (battingSkill: number) => {
    if (battingSkill >= 80) return 'tier1';
    if (battingSkill >= 65) return 'tier2';
    if (battingSkill >= 50) return 'tier3';
    if (battingSkill >= 30) return 'tier4';
    return 'tier5';
};

const T20_PROFILES = {
    tier1: { NA: { avg: 40, sr: 135 }, N: { avg: 40, sr: 125 }, D: { avg: 30, sr: 110 }, A: { avg: 25, sr: 155 } },
    tier2: { NA: { avg: 32, sr: 125 }, N: { avg: 32, sr: 115 }, D: { avg: 25, sr: 100 }, A: { avg: 22, sr: 140 } },
    tier3: { NA: { avg: 25, sr: 115 }, N: { avg: 25, sr: 105 }, D: { avg: 20, sr: 95 }, A: { avg: 18, sr: 125 } },
    tier4: { NA: { avg: 18, sr: 100 }, N: { avg: 18, sr: 90 }, D: { avg: 15, sr: 85 }, A: { avg: 15, sr: 110 } },
    tier5: { NA: { avg: 12, sr: 85 }, N: { avg: 12, sr: 80 }, D: { avg: 10, sr: 70 }, A: { avg: 10, sr: 95 } },
};
const ODI_PROFILES = {
    tier1: { NA: { avg: 45, sr: 95 }, N: { avg: 45, sr: 90 }, D: { avg: 40, sr: 80 }, A: { avg: 35, sr: 105 } },
    tier2: { NA: { avg: 38, sr: 90 }, N: { avg: 38, sr: 85 }, D: { avg: 32, sr: 75 }, A: { avg: 28, sr: 100 } },
    tier3: { NA: { avg: 30, sr: 85 }, N: { avg: 30, sr: 80 }, D: { avg: 25, sr: 70 }, A: { avg: 22, sr: 90 } },
    tier4: { NA: { avg: 22, sr: 75 }, N: { avg: 22, sr: 70 }, D: { avg: 18, sr: 65 }, A: { avg: 16, sr: 85 } },
    tier5: { NA: { avg: 15, sr: 70 }, N: { avg: 15, sr: 65 }, D: { avg: 12, sr: 60 }, A: { avg: 12, sr: 75 } },
};
const FC_PROFILES = {
    tier1: { NA: { avg: 45, sr: 55 }, N: { avg: 45, sr: 50 }, D: { avg: 48, sr: 45 }, A: { avg: 40, sr: 65 } },
    tier2: { NA: { avg: 38, sr: 50 }, N: { avg: 38, sr: 45 }, D: { avg: 40, sr: 40 }, A: { avg: 32, sr: 60 } },
    tier3: { NA: { avg: 30, sr: 45 }, N: { avg: 30, sr: 40 }, D: { avg: 32, sr: 38 }, A: { avg: 25, sr: 55 } },
    tier4: { NA: { avg: 22, sr: 40 }, N: { avg: 22, sr: 38 }, D: { avg: 25, sr: 35 }, A: { avg: 18, sr: 48 } },
    tier5: { NA: { avg: 15, sr: 35 }, N: { avg: 15, sr: 32 }, D: { avg: 18, sr: 30 }, A: { avg: 12, sr: 40 } },
};

export const BATTING_PROFILES = {
  [Format.T20]: T20_PROFILES,
  [Format.ODI]: ODI_PROFILES,
  [Format.SHIELD]: FC_PROFILES,
};

export const LoadingSpinner = () => (
    React.createElement("div", { className: "flex justify-center items-center h-full w-full" },
        React.createElement("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500 dark:border-teal-400" })
    )
);

export const aggregateStats = (player: Player, formats: Format[], season?: number): PlayerStats => {
    const total = generateSingleFormatInitialStats();
    formats.forEach(f => {
        const s = season && player.seasonStats?.[season] 
            ? player.seasonStats[season][f] 
            : player.stats[f];
        if (s) {
            total.matches += s.matches;
            total.runs += s.runs;
            total.ballsFaced += s.ballsFaced;
            total.dismissals += s.dismissals;
            if (s.highestScore > total.highestScore) total.highestScore = s.highestScore;
            total.hundreds += s.hundreds;
            total.fifties += s.fifties;
            total.thirties += s.thirties;
            total.fours += s.fours;
            total.sixes += s.sixes;
            if (s.fastestFifty > 0 && (total.fastestFifty === 0 || s.fastestFifty < total.fastestFifty)) total.fastestFifty = s.fastestFifty;
            if (s.fastestHundred > 0 && (total.fastestHundred === 0 || s.fastestHundred < total.fastestHundred)) total.fastestHundred = s.fastestHundred;
            total.wickets += s.wickets;
            total.ballsBowled += s.ballsBowled;
            total.runsConceded += s.runsConceded;
            total.threeWicketHauls += s.threeWicketHauls;
            total.fiveWicketHauls += s.fiveWicketHauls;
            total.catches += s.catches;
            total.runOuts += s.runOuts;
            total.manOfTheMatchAwards += s.manOfTheMatchAwards;
            if (s.bestBowlingWickets > total.bestBowlingWickets || (s.bestBowlingWickets === total.bestBowlingWickets && s.bestBowlingRuns < total.bestBowlingRuns)) {
                total.bestBowlingWickets = s.bestBowlingWickets;
                total.bestBowlingRuns = s.bestBowlingRuns;
                total.bestBowling = s.bestBowling;
            }

            // Aggregate phase-wise stats safely
            if (s.phaseStats && total.phaseStats) {
                const tpb = total.phaseStats.batting;
                const spb = s.phaseStats.batting;
                tpb.pp.runs += spb.pp?.runs || 0;
                tpb.pp.balls += spb.pp?.balls || 0;
                tpb.pp.dismissals += spb.pp?.dismissals || 0;
                tpb.mo.runs += spb.mo?.runs || 0;
                tpb.mo.balls += spb.mo?.balls || 0;
                tpb.mo.dismissals += spb.mo?.dismissals || 0;
                tpb.do.runs += spb.do?.runs || 0;
                tpb.do.balls += spb.do?.balls || 0;
                tpb.do.dismissals += spb.do?.dismissals || 0;

                const tpw = total.phaseStats.bowling;
                const spw = s.phaseStats.bowling;
                tpw.pp.wickets += spw.pp?.wickets || 0;
                tpw.pp.runsConceded += spw.pp?.runsConceded || 0;
                tpw.pp.ballsBowled += spw.pp?.ballsBowled || 0;
                tpw.mo.wickets += spw.mo?.wickets || 0;
                tpw.mo.runsConceded += spw.mo?.runsConceded || 0;
                tpw.mo.ballsBowled += spw.mo?.ballsBowled || 0;
                tpw.do.wickets += spw.do?.wickets || 0;
                tpw.do.runsConceded += spw.do?.runsConceded || 0;
                tpw.do.ballsBowled += spw.do?.ballsBowled || 0;
            }

            // Aggregate batting position-wise stats safely
            if (s.positionStats && total.positionStats) {
                for (let pos = 1; pos <= 11; pos++) {
                    const tpos = total.positionStats[pos];
                    const spos = s.positionStats[pos];
                    if (spos && tpos) {
                        tpos.innings += spos.innings || 0;
                        tpos.runs += spos.runs || 0;
                        tpos.balls += spos.balls || 0;
                        tpos.dismissals += spos.dismissals || 0;
                        tpos.thirties += spos.thirties || 0;
                        tpos.fifties += spos.fifties || 0;
                        tpos.hundreds += spos.hundreds || 0;
                    }
                }
            }
        }
    });
    total.average = total.dismissals > 0 ? total.runs / total.dismissals : total.runs;
    total.strikeRate = total.ballsFaced > 0 ? (total.runs / total.ballsFaced) * 100 : 0;
    total.bowlingAverage = total.wickets > 0 ? total.runsConceded / total.wickets : 0; 
    total.economy = total.ballsBowled > 0 ? (total.runsConceded / total.ballsBowled) * 6 : 0;
    return total;
};

export const calculatePopularityPoints = (result: MatchResult, format: Format, userTeamId: string): number => {
    let points = 0;
    const userInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(i => i?.teamId === userTeamId);
    userInnings.forEach(ing => { if (ing && ing.score >= 200) points += 1; });
    if (result.winnerId === userTeamId) points += 2;
    return points;
};

export const generateLeagueSchedule = (teams: Team[], format: Format, doubleRoundRobin: boolean = true): Match[] => {
    const matches: Match[] = [];
    if (teams.length < 2) return [];

    // Basic round-robin pairs
    const pairs: [Team, Team][] = [];
    for(let i=0; i<teams.length; i++) {
        for(let j=i+1; j<teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }

    // Add matches
    let matchCounter = 1;
    pairs.forEach(([tA, tB]) => {
        matches.push({ matchNumber: matchCounter++, teamA: tA.name, teamAId: tA.id, vs: 'vs', teamB: tB.name, teamBId: tB.id, date: `Match Day ${matchCounter}`, group: 'Round-Robin' });
    });

    if (doubleRoundRobin) {
        pairs.forEach(([tA, tB]) => {
            matches.push({ matchNumber: matchCounter++, teamA: tB.name, teamAId: tB.id, vs: 'vs', teamB: tA.name, teamBId: tA.id, date: `Match Day ${matchCounter}`, group: 'Round-Robin' });
        });
    }

    // Add knockouts
    if (teams.length >= 4) {
        matches.push({ matchNumber: 'SF1', teamA: '1st', vs: 'vs', teamB: '4th', date: 'Semi-Final Day', group: 'Semi-Finals' });
        matches.push({ matchNumber: 'SF2', teamA: '2nd', vs: 'vs', teamB: '3rd', date: 'Semi-Final Day', group: 'Semi-Finals' });
        matches.push({ matchNumber: 'Final', teamA: 'SF1 Winner', vs: 'vs', teamB: 'SF2 Winner', date: 'Finals Day', group: 'Final' });
    } else if (teams.length >= 2) {
        matches.push({ matchNumber: 'Final', teamA: '1st', vs: 'vs', teamB: '2nd', date: 'Finals Day', group: 'Final' });
    }

    return matches;
};

export const negotiateSponsorships = (popularity: number): Record<Format, Sponsorship> => {
    const newSponsorships: any = {};
    Object.values(Format).forEach(f => {
        newSponsorships[f] = { sponsorName: BRANDS[0].name, tournamentName: "Cup", logoColor: "text-teal-500", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: TV_CHANNELS[0].name, tvLogo: TV_CHANNELS[0].logo };
    });
    return newSponsorships;
};

export const generateMatchNews = (result: MatchResult, format: string, sponsorship: Sponsorship): NewsArticle => ({
    id: `news-${(Date.now())}`, headline: `Match Result: ${result.summary}`, date: new Date().toLocaleDateString(), excerpt: result.summary, content: result.summary, type: 'match'
});

export const generatePreMatchNews = (match: Match, gameData: GameData): NewsArticle => ({
    id: `news-pre-${(Date.now())}`, headline: `Upcoming: ${match.teamA} vs ${match.teamB}`, date: new Date().toLocaleDateString(), excerpt: "Pre-match preview.", content: "Full preview content.", type: 'match'
});

export interface PlayerRanking {
    player: Player;
    points: number;
    teamName: string;
}

export const calculatePlayerRankings = (players: Player[], format: Format, teams: Team[]) => {
    const scoredPlayers = players.map(p => ({ player: p, points: p.stats[format]?.runs || 0, teamName: "Team" }));
    return { batters: scoredPlayers, bowlers: scoredPlayers, allRounders: scoredPlayers };
};

export const getPlayerBasePrice = (player: Player): number => {
    const isBowler = [PlayerRole.FAST_BOWLER, PlayerRole.SPIN_BOWLER, PlayerRole.ALL_ROUNDER].includes(player.role);
    const attr = Math.max(player.battingSkill, player.secondarySkill);
    
    if (attr >= 80) return isBowler ? 3.0 : 2.0;
    if (attr >= 70) return isBowler ? 2.0 : 1.5;
    if (attr >= 60) return isBowler ? 1.0 : 0.7;
    return 0.35; // 35 lac average (30-40 range)
};

export const getPlayerMarketPrice = (player: Player): number => {
    const base = getPlayerBasePrice(player);
    const attr = Math.max(player.battingSkill, player.secondarySkill);
    // Market price (estimated auction end price)
    if (attr >= 80) return base * 5;
    if (attr >= 70) return base * 4;
    return base * 3;
};

export const getPlayerBadges = (player: Player): string[] => {
    const badges: string[] = [];
    if (player.isFinisher) badges.push("Finisher");
    if (player.isPowerHitter) badges.push("Power Hitter");

    // Phase Badges (Powerplay, Middle Overs, Finisher/Death Overs)
    // We check T20 stats or ODI stats for phase performance!
    const t20Stats = player.stats[Format.T20];
    const odiStats = player.stats[Format.T20] || player.stats[Format.ODI];

    // Check Batting Phase Badges
    if (t20Stats?.phaseStats?.batting) {
        const p = t20Stats.phaseStats.batting;
        // PP Batter: High SR or runs inside PP
        if (p.pp.runs > 30 && (p.pp.runs / (p.pp.balls || 1)) * 100 > 130) {
            badges.push("Powerplay Batter");
        }
        // MO Batter: High runs inside MO and low rate of dismissals (anchor)
        if (p.mo.runs > 50 && p.mo.balls > 30 && (p.mo.runs / (p.mo.dismissals || 1)) > 30) {
            badges.push("Middle Overs Anchor");
        }
        // Finisher: High Death Overs strike rate and runs
        if (p.do.runs > 30 && (p.do.runs / (p.do.balls || 1)) * 100 > 145) {
            badges.push("Death Overs Finisher");
        }
    }

    // Check Bowling Phase Badges
    if (t20Stats?.phaseStats?.bowling) {
        const b = t20Stats.phaseStats.bowling;
        if (b.pp.ballsBowled > 18 && (b.pp.runsConceded / (b.pp.ballsBowled / 6)) < 7.5) {
            badges.push("PP Swing Specialist");
        }
        if (b.mo.wickets > 3 && (b.mo.runsConceded / (b.mo.ballsBowled / 6)) < 7.8) {
            badges.push("MO Spin Wizard");
        }
        if (b.do.wickets > 3 && (b.do.runsConceded / (b.do.ballsBowled / 6)) < 9.8) {
            badges.push("Death Specialist");
        }
    }

    const batRating = player.battingSkill;
    const bowlRating = player.secondarySkill;

    // Define star badges: King, Prince, Run Machine, Boom Boom, Chase Master, The Wall
    if (player.role === PlayerRole.BATSMAN && batRating >= 73) {
        badges.push("King");
    } else if (player.role === PlayerRole.BATSMAN && player.style === 'D' && batRating >= 65) {
        badges.push("The Wall");
    } else if (player.role === PlayerRole.BATSMAN && batRating >= 68 && batRating < 73) {
        badges.push("Prince");
    }

    if ((t20Stats?.runs || 0) > 150 || ((odiStats?.runs || 0) > 200)) {
        badges.push("Run Machine");
    }

    if (player.role === PlayerRole.BATSMAN && player.style === 'A' && batRating >= 65) {
        badges.push("Boom Boom");
    }

    if (player.role === PlayerRole.BATSMAN && batRating >= 71) {
        badges.push("Chase Master");
    }

    // Custom named badge
    const firstName = player.name.split(' ')[0];
    if (batRating >= 70) {
        badges.push(`Super ${firstName}`);
    } else if (bowlRating >= 70) {
        badges.push(`${firstName} Express`);
    } else if (batRating >= 60 || bowlRating >= 60) {
        badges.push(`${firstName} Warrior`);
    }

    // Default badges if none
    if (badges.length === 0) {
        if (player.role === PlayerRole.BATSMAN) badges.push("Classic Legend");
        else if (player.role === PlayerRole.FAST_BOWLER) badges.push("Pace Warrior");
        else if (player.role === PlayerRole.SPIN_BOWLER) badges.push("Spin Doctor");
        else badges.push("Team Champion");
    }

    return Array.from(new Set(badges));
};

export const getAutomatedWeakness = (player: Player): BowlingSubType[] => {
    if (player.weaknesses && player.weaknesses.length > 0) return player.weaknesses;
    if (player.battingSkill <= 40) return []; 
    
    const pools: BowlingSubType[] = ['ls', 'os', 'lals', 'laos', 'lac', 'fb', 'fbs', 'm', 'mv'];
    let weights = pools.map(() => 1);
    
    if (player.style === 'A' || player.style === 'NA') {
        ['ls', 'lac', 'fb'].forEach(s => {
            const idx = pools.indexOf(s as BowlingSubType);
            if (idx !== -1) weights[idx] += 3;
        });
    } else if (player.style === 'D') {
        ['fbs', 'mv', 'os'].forEach(s => {
            const idx = pools.indexOf(s as BowlingSubType);
            if (idx !== -1) weights[idx] += 3;
        });
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const pickOne = (): BowlingSubType => {
        let r = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return pools[i];
        }
        return pools[0];
    };

    if (player.battingSkill > 70) {
        return [pickOne()];
    }
    return [];
};

export const generateScoutReport = (player: Player, format: Format): string => {
    const stats = player.stats[format];
    if (!stats || stats.matches === 0) return `${player.name} is a developing talent. Early data suggests a ${player.style} approach with core potential in ${player.role === PlayerRole.BATSMAN ? 'top-order stability' : player.role === PlayerRole.FAST_BOWLER ? 'raw pace execution' : 'tactical discipline'}.`;

    const reports: string[] = [];
    
    // Strengths
    if (player.battingSkill > 75) reports.push(`CORE STRENGTH: An elite ${player.style === 'A' ? 'aggressive' : 'technical'} run-machine. Capable of dictating terms on any surface.`);
    else if (player.battingSkill > 60) reports.push(`CORE STRENGTH: Reliable middle-order presence with solid boundary-hitting capability.`);
    
    if (player.secondarySkill > 75) reports.push(`BOWLING THREAT: A frontline weapon. Exhibits ${player.role === PlayerRole.FAST_BOWLER ? 'terrifying pace' : 'deceptive flight and turn'} that frequently induces errors.`);
    
    // Position/Role Fit
    if (player.isOpener) reports.push(`TACTICAL FIT: Optimized for the new ball. Prefers pace on the bat and excels in the Powerplay.`);
    if (player.isFinisher) reports.push(`TACTICAL FIT: Pure finisher. Maintains exceptional composure in high-pressure death-overs situations.`);
    if (player.isPowerHitter) reports.push(`POWER RATING: Exceptional raw power. Can clear any boundary when the sweet-spot is found.`);

    // Weaknesses
    if (player.weaknesses && player.weaknesses.length > 0) {
        const wLabels = player.weaknesses.map(w => w === 'fb' ? 'Extra Pace' : w === 'ls' ? 'Leg Spin' : w === 'lac' ? 'Chinaman' : w);
        reports.push(`VULNERABILITY: Struggles heavily against ${wLabels.join(' and ')}. Tactical opposition will exploit this entry logic.`);
    }

    // Recent Form (Heuristic)
    if (stats.runs > 200 && stats.average > 40) reports.push(`FORM: Currently in a golden patch. Confidence is sky-high.`);
    else if (stats.wickets > 10 && stats.economy < 7.5) reports.push(`FORM: Bowling rhythm is perfect. Consistently hitting the right channels.`);

    return reports.join(' ');
};

export const initializePlayersWithWeaknesses = (players: Player[]): Player[] => {
    return players.map(p => ({
        ...p,
        weaknesses: getAutomatedWeakness(p)
    }));
};