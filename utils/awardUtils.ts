
import { BattingPerformance, BowlingPerformance, Inning, MatchResult, Player, Format, Award, GameData, Team } from '../types';

/**
 * Calculates a performance score for a player in a specific match.
 * Used for Player of the Match (POTM) identification.
 */
export const calculatePlayerMatchScore = (
    batter: BattingPerformance | null,
    bowler: BowlingPerformance | null,
    isWinner: boolean
): number => {
    let score = 0;

    // Batting Points
    if (batter) {
        score += batter.runs;
        // Bonus for milestones
        if (batter.runs >= 100) score += 50;
        else if (batter.runs >= 50) score += 25;
        
        // Strike rate bonus (min 10 balls)
        if (batter.balls >= 10) {
            const sr = (batter.runs / batter.balls) * 100;
            if (sr > 150) score += 15;
            else if (sr > 200) score += 30;
        }

        // Boundaires
        score += (batter.fours * 1) + (batter.sixes * 2);
    }

    // Bowling Points
    if (bowler) {
        score += (bowler.wickets * 25);
        // Bonus for hauls
        if (bowler.wickets >= 5) score += 50;
        else if (bowler.wickets >= 3) score += 20;

        // Economy bonus (min 2 overs)
        if (bowler.ballsBowled >= 12) {
            const econ = (bowler.runsConceded / bowler.ballsBowled) * 6;
            if (econ < 6) score += 20;
            else if (econ < 4.5) score += 40;
        }
    }

    // Winner bonus
    if (isWinner) {
        score *= 1.25;
    }

    return score;
};

/**
 * Identifies the Player of the Match for a finished match.
 */
export const getPlayerOfTheMatch = (result: MatchResult): { playerId: string, playerName: string, teamId: string, summary: string } => {
    const allInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(Boolean) as Inning[];
    
    let bestScore = -1;
    let potm = { playerId: '', playerName: '', teamId: '', summary: '' };

    allInnings.forEach((inning) => {
        const isWinner = inning.teamId === result.winnerId;
        
        // Check Batters
        inning.batting.forEach(bat => {
            // Find if they also bowled in this or other innings (for all-rounders)
            // In First-Class, they might have multiple batting/bowling performances
            // For simplicity, we aggregate their match performance if possible, 
            // but here we check per performance
            
            // Look for their bowling in this match
            let bowlPerf: BowlingPerformance | null = null;
            allInnings.forEach(inn => {
                const found = inn.bowling.find(b => b.playerId === bat.playerId);
                if (found) bowlPerf = found; // Note: simplified to last found, in multi-innings we should sum
            });

            const score = calculatePlayerMatchScore(bat, bowlPerf, isWinner);
            if (score > bestScore) {
                bestScore = score;
                potm = {
                    playerId: bat.playerId,
                    playerName: bat.playerName,
                    teamId: inning.teamId,
                    summary: bat.runs > 0 
                        ? `${bat.runs}(${bat.balls})${bowlPerf && bowlPerf.wickets > 0 ? ` & ${bowlPerf.wickets}/${bowlPerf.runsConceded}` : ''}`
                        : `${bowlPerf!.wickets}/${bowlPerf!.runsConceded}`
                };
            }
        });

        // Check Bowlers who didn't bat or were tail-enders
        inning.bowling.forEach(bowl => {
            const batPerf = inning.batting.find(b => b.playerId === bowl.playerId) || null;
            const score = calculatePlayerMatchScore(batPerf, bowl, isWinner);
            if (score > bestScore) {
                bestScore = score;
                potm = {
                    playerId: bowl.playerId,
                    playerName: bowl.playerName,
                    teamId: (inning.teamId === result.firstInning.teamId) ? result.secondInning.teamId : result.firstInning.teamId, // Bowler belongs to opposition
                    summary: `${bowl.wickets}/${bowl.runsConceded}${batPerf && batPerf.runs > 0 ? ` & ${batPerf.runs}(${batPerf.balls})` : ''}`
                };
            }
        });
    });

    return potm;
};

/**
 * Calculates End of Season Awards for a format.
 */
export const calculateSeasonAwards = (gameData: GameData, format: Format): Award => {
    const standings = gameData.standings[format];
    const winnerTeam = standings[0];
    
    const allPlayers = gameData.allPlayers;
    
    const season = gameData.currentSeason;
    
    // 1. Best Batter (Orange Cap)
    const bestBatterPlayer = [...allPlayers].sort((a, b) => (b.seasonStats?.[season]?.[format]?.runs || 0) - (a.seasonStats?.[season]?.[format]?.runs || 0))[0];
    
    // 2. Best Bowler (Purple Cap)
    const bestBowlerPlayer = [...allPlayers].sort((a, b) => (b.seasonStats?.[season]?.[format]?.wickets || 0) - (a.seasonStats?.[season]?.[format]?.wickets || 0))[0];
    
    // 3. Power Hitter (Most Sixes)
    const powerHitterPlayer = [...allPlayers].sort((a, b) => (b.seasonStats?.[season]?.[format]?.sixes || 0) - (a.seasonStats?.[season]?.[format]?.sixes || 0))[0];
    
    // 4. Player of the Season (MVP)
    // Points = Runs + (Wickets * 20) + (Sixes * 2) + (Catches * 10) + (POTMs * 50)
    const mvpPlayer = [...allPlayers].sort((a, b) => {
        const getPoints = (p: Player) => {
            const s = p.seasonStats?.[season]?.[format];
            if (!s) return 0;
            return s.runs + (s.wickets * 20) + (s.sixes * 2) + (s.catches * 10) + (s.manOfTheMatchAwards * 50);
        };
        return getPoints(b) - getPoints(a);
    })[0];

    const getTeamName = (p: Player) => {
        return p.teamName || 'Unknown';
    };

    return {
        season: gameData.currentSeason,
        format,
        winnerTeamId: winnerTeam.teamId,
        winnerTeamName: winnerTeam.teamName,
        playerOfSeason: {
            playerId: mvpPlayer.id,
            playerName: mvpPlayer.name,
            teamName: getTeamName(mvpPlayer),
            impact: (mvpPlayer.seasonStats?.[season]?.[format]?.runs || 0) + ((mvpPlayer.seasonStats?.[season]?.[format]?.wickets || 0) * 20)
        },
        bestBatter: {
            playerId: bestBatterPlayer.id,
            playerName: bestBatterPlayer.name,
            teamName: getTeamName(bestBatterPlayer),
            runs: bestBatterPlayer.seasonStats?.[season]?.[format]?.runs || 0
        },
        bestBowler: {
            playerId: bestBowlerPlayer.id,
            playerName: bestBowlerPlayer.name,
            teamName: getTeamName(bestBowlerPlayer),
            wickets: bestBowlerPlayer.seasonStats?.[season]?.[format]?.wickets || 0
        },
        powerHitter: {
            playerId: powerHitterPlayer.id,
            playerName: powerHitterPlayer.name,
            teamName: getTeamName(powerHitterPlayer),
            sixes: powerHitterPlayer.seasonStats?.[season]?.[format]?.sixes || 0
        }
    };
};
