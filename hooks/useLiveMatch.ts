
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameData, Match, Player, Format, Team, Inning, MatchResult, PlayerRole, BattingPerformance, BowlingPerformance, Strategy, LiveMatchState } from '../types';
import { PITCH_MODIFIERS, formatOvers, getPlayerById, generateAutoXI, getBatterTier, BATTING_PROFILES, getCommentary } from '../utils';

export const useLiveMatch = (
    match: Match,
    gameData: GameData,
    onMatchComplete: (result: MatchResult) => void,
    initialState?: LiveMatchState | null
) => {
    const [state, setState] = useState<LiveMatchState | null>(initialState || null);
    const matchIdRef = useRef<string | number | null>(initialState ? initialState.match.matchNumber : null);
    const autoPlayRef = useRef<any>(null); 
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [groundPitch, setGroundPitch] = useState("Balanced Sporting Pitch");
    const [groundCode, setGroundCode] = useState("KCG");

    // Initialization
    useEffect(() => {
        if (state) {
             // Restore players context if resuming
             const teamAData = gameData.teams.find(t => t.id === state.match.teamAId) || gameData.teams.find(t => t.name === state.match.teamA);
             const teamBData = gameData.teams.find(t => t.id === state.match.teamBId) || gameData.teams.find(t => t.name === state.match.teamB);
             
             if (teamAData && teamBData) {
                 const allP = [...teamAData.squad, ...teamBData.squad];
                 // Hydrate full player objects
                 const hydratedPlayers = allP.map(p => gameData.allPlayers.find(gp => gp.id === p.id) || p);
                 setAllPlayers(hydratedPlayers);
             }
             return;
        }

        if (matchIdRef.current === match.matchNumber) return;

        const teamAData = gameData.teams.find(t => t.name === match.teamA);
        const teamBData = gameData.teams.find(t => t.name === match.teamB);
        
        if (!teamAData || !teamBData) {
            console.error("Teams not found for live match:", match.teamA, match.teamB);
            return;
        }

        const getPlayingXI = (team: Team) => {
            const customXI = gameData.playingXIs?.[team.id]?.[gameData.currentFormat];
            if (customXI && customXI.length === 11) {
                const xiPlayers = customXI.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
                if (xiPlayers.length === 11) return xiPlayers;
            }
            return generateAutoXI(team.squad, gameData.currentFormat);
        };

        const teamAPlayers = getPlayingXI(teamAData);
        const teamBPlayers = getPlayingXI(teamBData);
        const matchPlayers = [...teamAPlayers, ...teamBPlayers];
        setAllPlayers(matchPlayers);

        const homeGround = gameData.grounds.find(g => g.code === gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround);
        setGroundPitch(homeGround?.pitch || "Balanced Sporting Pitch");
        setGroundCode(homeGround?.code || "KCG");

        const initInning = (team: Team, opponent: Team): Inning => {
            const battingLineup: BattingPerformance[] = team.squad.map(p => {
                const d = getPlayerById(p.id, matchPlayers);
                return { playerId: d.id, playerName: d.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalText: 'not out', dismissal: { type: 'not out', bowlerId: '' } };
            });
            
            const bowlingLineup: BowlingPerformance[] = opponent.squad
                .filter(p => getPlayerById(p.id, matchPlayers).role !== PlayerRole.WICKET_KEEPER)
                .map(p => {
                     const d = getPlayerById(p.id, matchPlayers);
                     return { playerId: d.id, playerName: d.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 };
                });

            if (bowlingLineup.length === 0) {
                 const p = getPlayerById(opponent.squad[0].id, matchPlayers);
                 bowlingLineup.push({ playerId: p.id, playerName: p.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 });
            }

            return {
                teamId: team.id,
                teamName: team.name,
                score: 0,
                wickets: 0,
                overs: '0.0',
                batting: battingLineup,
                bowling: bowlingLineup,
                extras: 0
            };
        };

        const teamA = { ...teamAData, squad: teamAPlayers };
        const teamB = { ...teamBData, squad: teamBPlayers };
        
        const firstInning = initInning(teamA, teamB);
        const secondInning = initInning(teamB, teamA);
        
        matchIdRef.current = match.matchNumber;
        
        setState({
            status: 'toss',
            match: { ...match, teamAId: teamA.id, teamBId: teamB.id }, // Ensure IDs are set
            currentInningIndex: 0,
            innings: [firstInning, secondInning],
            target: null,
            currentBatters: { strikerId: teamAPlayers[0].id, nonStrikerId: teamAPlayers[1].id },
            currentBowlerId: secondInning.bowling[0].playerId, 
            recentBalls: [],
            commentary: ["Welcome to the live coverage!", "The players are walking out to the middle."],
            battingTeam: teamA,
            bowlingTeam: teamB,
            requiredRunRate: 0,
            currentPartnership: { runs: 0, balls: 0 },
            fallOfWickets: [],
            waitingFor: 'openers',
            strategies: { batting: {}, bowling: 'balanced' },
            autoPlayType: null,
            tossWinnerId: null,
            tossDecision: null,
        });

    }, [match.matchNumber, match.teamA, match.teamB, gameData, state]);

    const startMatch = (winnerId: string, decision: 'bat' | 'bowl') => {
        setState(prev => {
            if (!prev) return null;
            // Determine who bats first
            let battingTeam, bowlingTeam;
            const teamA = prev.battingTeam.id === prev.match.teamAId ? prev.battingTeam : prev.bowlingTeam;
            const teamB = prev.battingTeam.id === prev.match.teamBId ? prev.battingTeam : prev.bowlingTeam;

            if (winnerId === teamA.id) {
                battingTeam = decision === 'bat' ? teamA : teamB;
                bowlingTeam = decision === 'bat' ? teamB : teamA;
            } else {
                battingTeam = decision === 'bat' ? teamB : teamA;
                bowlingTeam = decision === 'bat' ? teamA : teamB;
            }

            // Re-initialize innings with correct order using Locked Playing XI
            const initInning = (team: Team, opponent: Team): Inning => {
                const getXI = (t: Team) => {
                    const savedXI = gameData.playingXIs[t.id]?.[gameData.currentFormat];
                    if (savedXI && savedXI.length === 11) {
                        return savedXI.map(id => t.squad.find(p => p.id === id)).filter(Boolean) as Player[];
                    }
                    // Fallback to auto-generated if none found (should not happen if lineups were set)
                    return t.squad.sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill)).slice(0, 11);
                };

                const squadXI = getXI(team);
                const oppXI = getXI(opponent);

                const battingLineup: BattingPerformance[] = squadXI.map((p, idx) => {
                    const d = getPlayerById(p.id, allPlayers);
                    return { 
                        playerId: d.id, 
                        playerName: d.name, 
                        runs: 0, balls: 0, fours: 0, sixes: 0, 
                        isOut: false, dismissalText: 'not out', 
                        dismissal: { type: 'not out', bowlerId: '' },
                        injury: d.injury,
                        healthStatus: d.healthStatus,
                        battingPosition: idx + 1
                    };
                });
                
                const bowlingLineup: BowlingPerformance[] = oppXI
                    .filter(p => getPlayerById(p.id, allPlayers).role !== PlayerRole.WICKET_KEEPER)
                    .map(p => {
                         const d = getPlayerById(p.id, allPlayers);
                         return { 
                            playerId: d.id, 
                            playerName: d.name, 
                            overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0,
                            injury: d.injury,
                            healthStatus: d.healthStatus
                         };
                    });

                if (bowlingLineup.length === 0) {
                     const p = getPlayerById(oppXI[0].id, allPlayers);
                     bowlingLineup.push({ playerId: p.id, playerName: p.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 });
                }

                return {
                    teamId: team.id,
                    teamName: team.name,
                    score: 0,
                    wickets: 0,
                    overs: '0.0',
                    batting: battingLineup,
                    bowling: bowlingLineup,
                    extras: 0
                };
            };

            const firstInning = initInning(battingTeam, bowlingTeam);
            const secondInning = initInning(bowlingTeam, battingTeam);

            // Auto-select initial batters and bowler for AI
            let openers = { strikerId: firstInning.batting[0].playerId, nonStrikerId: firstInning.batting[1].playerId };
            let bowlerId = firstInning.bowling[0].playerId;
            let waitingFor: LiveMatchState['waitingFor'] = null;
            
            const isUserBatting = battingTeam.id === gameData.userTeamId;
            if (isUserBatting) {
                waitingFor = 'openers';
            } else {
                // AI starts: Defaults already set above
                if (bowlingTeam.id === gameData.userTeamId) {
                    waitingFor = 'bowler';
                }
            }

            return {
                ...prev,
                status: 'post_toss',
                tossWinnerId: winnerId,
                tossDecision: decision,
                battingTeam,
                bowlingTeam,
                innings: [firstInning, secondInning],
                currentInningIndex: 0,
                currentBatters: openers,
                currentBowlerId: bowlerId,
                waitingFor: waitingFor,
                autoPlayType: null, 
                commentary: [
                    `Match Started!`,
                    `${winnerId === teamA.id ? teamA.name : teamB.name} won the toss and elected to ${decision}.`,
                    ...prev.commentary
                ]
            };
        });
    };

    const proceedToMatch = () => {
        setState(prev => prev ? { ...prev, status: prev.status === 'post_toss' ? 'ready' : prev.status, milestoneEvent: null } : null);
    };

    const stopAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
    };

    const playBall = useCallback(() => {
        setState(prevState => {
            if (!prevState || prevState.status === 'completed') {
                 stopAutoPlay();
                 return prevState;
            }
            
            if (prevState.waitingFor) {
                // If in match or inning simulation mode, force selection
                if (prevState.autoPlayType === 'match' || prevState.autoPlayType === 'inning') {
                    // Fallthrough to auto-select logic below...
                } else {
                    stopAutoPlay();
                    return prevState;
                }
            }
            
            const newState = JSON.parse(JSON.stringify(prevState)) as LiveMatchState;
            const { currentInningIndex, innings, battingTeam, bowlingTeam, currentBatters, currentBowlerId, target, strategies } = newState;
            const currentInning = innings[currentInningIndex];
            
            const pitchMods = PITCH_MODIFIERS[groundPitch as keyof typeof PITCH_MODIFIERS] || PITCH_MODIFIERS["Balanced Sporting Pitch"];
            const formatMods = pitchMods[gameData.currentFormat];
            
            let striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
            let bowler = currentInning.bowling.find(b => b.playerId === currentBowlerId);
            
             // --- EMERGENCY AUTO-SELECT FOR MATCH/INNING SIMULATION ---
            if (newState.autoPlayType === 'match' || newState.autoPlayType === 'inning') {
                if (!striker || striker.isOut) {
                    const available = currentInning.batting.filter(b => !b.isOut && b.playerId !== currentBatters.nonStrikerId);
                    if (available.length > 0) {
                        // AI picks next best batter usually, but here we just take next in line
                        const nextB = available[0];
                        newState.currentBatters.strikerId = nextB.playerId;
                        striker = nextB;
                        newState.waitingFor = null;
                    }
                }
                if (!bowler) {
                    const overLimit = (gameData.currentFormat.includes('T20') ? 4 : 10);
                    const validBowlers = currentInning.bowling.filter(b => b.ballsBowled < overLimit * 6);
                    if (validBowlers.length > 0) {
                        const nextBowler = validBowlers[0];
                        newState.currentBowlerId = nextBowler.playerId;
                        bowler = nextBowler;
                        newState.waitingFor = null;
                    }
                }
            }

            if (!striker || !bowler) {
                 stopAutoPlay();
                 return newState;
            }

            const strikerDetails = getPlayerById(currentBatters.strikerId, allPlayers);
            const bowlerDetails = getPlayerById(currentBowlerId, allPlayers);

            // Algorithmic Weakness Logic
            let weaknessSkillMod = 1.0;
            if (strikerDetails.weaknesses && bowlerDetails.bowlingSubType && strikerDetails.weaknesses.includes(bowlerDetails.bowlingSubType)) {
                weaknessSkillMod = 1.25;
            }

            // Bowling Speed Calculation (Real range: 130-160 for Fast, 60-100 for Spin)
            let speed = 0;
            if (bowlerDetails.role === PlayerRole.FAST_BOWLER) {
                // Base 130, scale up to +30 based on skill (160 max)
                speed = 130 + (bowlerDetails.secondarySkill / 100 * 26) + (Math.random() * 4);
            } else if (bowlerDetails.role === PlayerRole.SPIN_BOWLER) {
                // Base 65, scale up to +30 based on skill (95-100 max)
                speed = 65 + (bowlerDetails.secondarySkill / 100 * 25) + (Math.random() * 10 - 5);
            } else {
                speed = 115 + (Math.random() * 15);
            }
            const ballSpeed = Number(speed.toFixed(1));

            const isUserBatting = battingTeam.id === gameData.userTeamId;
            let requiredRR = 0;
            if (target) {
                const ballsLeft = (gameData.currentFormat.includes('T20') ? 120 : 300) - (currentInning.bowling.reduce((a,b)=>a+b.ballsBowled,0));
                const runsNeeded = target - currentInning.score;
                if (ballsLeft > 0) requiredRR = (runsNeeded / ballsLeft) * 6;
            }

            if (!isUserBatting) {
                let aiStrat: Strategy = 'balanced';
                // Aggressive floor: If score is very low, AI bats more attacking to avoid < 100 totals
                if (!target && currentInning.score < 55 && (currentInning.overs.split('.')[0] === '10' || currentInning.overs.split('.')[0] === '15')) {
                    aiStrat = 'attacking';
                }

                if (target && requiredRR > 8.5) aiStrat = 'attacking';
                else if (target && requiredRR < 4.5) aiStrat = 'balanced';
                else aiStrat = Math.random() > 0.65 ? 'attacking' : 'balanced';

                strategies.batting[currentBatters.strikerId] = aiStrat;
            }
            
            if (battingTeam.id !== gameData.userTeamId && bowlingTeam.id === gameData.userTeamId) {
                 const recentWickets = newState.fallOfWickets.filter(w => w.score > currentInning.score - 20).length;
                 if (recentWickets > 0) strategies.bowling = 'attacking';
                 else if ((currentInning.score / (parseFloat(currentInning.overs)||1)) > 10) strategies.bowling = 'defensive';
                 else strategies.bowling = 'balanced';
            }

            const strikerStrategy = strategies.batting[currentBatters.strikerId] || 'balanced';
            let strategyRunMod = 1.0;
            let strategyWicketMod = 1.0;
            let tacticalNote = "";

            if (strikerStrategy === 'blitzkrieg') {
                strategyRunMod *= 1.85;
                strategyWicketMod *= 2.2;
            } else if (strikerStrategy === 'attacking') { 
                strategyRunMod *= 1.45; 
                const riskMitigation = (strikerDetails.battingSkill - 50) / 100;
                strategyWicketMod *= Math.max(1.15, 1.55 - riskMitigation); 
            }
            else if (strikerStrategy === 'defensive') { strategyRunMod *= 0.75; strategyWicketMod *= 0.65; }

            if (strategies.bowling === 'attacking') { strategyWicketMod *= 1.25; strategyRunMod *= 1.35; } 
            else if (strategies.bowling === 'defensive') { strategyWicketMod *= 0.85; strategyRunMod *= 0.85; }

            // Play Safe Logic
            if (newState.playSafeAgainst?.[currentBatters.strikerId]?.includes(currentBowlerId)) {
                strategyWicketMod *= 0.45; // Drastically lower risk
                strategyRunMod *= 0.6;   // TEMPERED aggression
                tacticalNote = `(TACTICAL) ${strikerDetails.name} is playing safe against ${bowlerDetails.name}.`;
            }

            let healthMult = 1.0;
            if (strikerDetails.healthStatus === 'temporary_fit') healthMult *= 0.85;
            if (bowlerDetails.healthStatus === 'temporary_fit') healthMult *= 0.85;

            const batterProfile = getPlayerById(striker.playerId, allPlayers).customProfiles?.[gameData.currentFormat] || BATTING_PROFILES[gameData.currentFormat][getBatterTier(strikerDetails.battingSkill)][strikerDetails.style] || BATTING_PROFILES[gameData.currentFormat]['tier3']['N'];
            
            let formatFloorBoost = gameData.currentFormat === Format.SHIELD ? 1.0 : 1.25;
            
            // Auto-Aggression for chasing - ignore chase penalty if pressure is high
            let chaseAggression = 1.0;
            let effectiveChasePenalty = target !== null ? pitchMods.chasePenalty : 1;
            if (target) {
                if (requiredRR > 11) {
                    chaseAggression = 1.4;
                    effectiveChasePenalty = 1.0; // Desperation ignores pitch caution
                }
                else if (requiredRR > 9) {
                    chaseAggression = 1.25;
                    effectiveChasePenalty = Math.max(1.0, effectiveChasePenalty);
                }
                else if (requiredRR > 7) chaseAggression = 1.05;
            }

            const expectedRunsPerBall = (batterProfile.sr / 100) * effectiveChasePenalty * strategyRunMod * healthMult * formatFloorBoost * chaseAggression * (newState.isExploitingWeakness ? 1.05 : 1.0) / (weaknessSkillMod > 1 ? 1.1 : 1.0);
            const baseWicketProb = (batterProfile.avg > 0 ? expectedRunsPerBall / (batterProfile.avg * healthMult) : 0.05) * strategyWicketMod * weaknessSkillMod * (newState.isExploitingWeakness ? 1.1 : 1.0);
            let wicketProbability = baseWicketProb * formatMods.wicketChance;
            
            // Pressure factor in Live match
            if (target && requiredRR > 10) {
                const skillClutchness = (strikerDetails.battingSkill - 60) / 100;
                wicketProbability *= (1 + Math.max(0, (requiredRR - 10) * 0.05 - skillClutchness));
            }
            
            // Crisis Prevention & Chase Motivation: Drastically reduce wickets if score is low
            const currentOver = parseInt(currentInning.overs.split('.')[0]);
            if (target) {
                // Block low scores for big chases (>150)
                if (target >= 145) {
                    if (currentInning.score < 45) wicketProbability *= 0.01; // Almost impossible early on in big chase
                    else if (currentInning.score < 100) wicketProbability *= 0.2; // Massive survival boost
                } else {
                    if (currentInning.score < 40) wicketProbability *= 0.05;
                    else if (currentInning.score < 100) wicketProbability *= 0.4;
                }
                
                // If required rate is high, skilled batters focus on survival + hitting
                const skillClutchness = (strikerDetails.battingSkill - 60) / 100;
                if (requiredRR > 10) {
                    wicketProbability *= (1 + Math.max(0, (requiredRR - 10) * 0.03 - skillClutchness)); 
                }
            } else if (gameData.currentFormat !== Format.SHIELD) {
                // First Inning protection
                if (currentInning.score < 40) wicketProbability *= 0.1;
                else if (currentInning.score < 80) wicketProbability *= 0.4;
                else if (currentOver < 10 && currentInning.score < 100) wicketProbability *= 0.7;
            }
            
            wicketProbability = Math.max(0.005, Math.min(0.4, wicketProbability));

             let runs = 0;
            let isOut = false;
            let ballLabel = "";
            let commentary = "";

            if (Math.random() < wicketProbability) {
                 isOut = true;
                 ballLabel = "W";
                 commentary = getCommentary(0, true, strikerDetails.name, bowlerDetails.name);
             } else {
                 const rand = Math.random();
                 
                 // Dynamic Probabilities based on skills & conditions
                 let p_dot=0.32, p_1=0.40, p_2=0.08, p_3=0.02, p_4=0.12, p_6=0.06;
                 
                 const skillDiff = (strikerDetails.battingSkill - bowlerDetails.secondarySkill) / 100;
                 p_dot -= skillDiff * 0.1;
                 p_4 += skillDiff * 0.05;
                 p_6 += skillDiff * 0.03;

                 if (!target && gameData.currentFormat !== Format.SHIELD && currentInning.score < 60) {
                    p_dot *= 0.7; p_4 *= 1.3; p_6 *= 1.2; // Aggressive boost for low totals
                 }

                 if (strikerStrategy === 'blitzkrieg') { p_dot *= 0.6; p_4 *= 1.8; p_6 *= 2.2; }
                 else if (strikerStrategy === 'attacking') { p_dot *= 0.8; p_4 *= 1.4; p_6 *= 1.6; }
                 else if (strikerStrategy === 'defensive') { p_dot *= 1.6; p_4 *= 0.5; p_6 *= 0.3; }
                 
                 if (strategies.bowling === 'attacking') { p_dot *= 0.8; p_4 *= 1.2; p_6 *= 1.3; }
                 else if (strategies.bowling === 'defensive') { p_dot *= 1.2; p_1 *= 1.1; p_4 *= 0.8; p_6 *= 0.7; }

                 const totalP = p_dot + p_1 + p_2 + p_3 + p_4 + p_6;
                 const normRand = rand * totalP;

                 if (normRand < p_dot) runs = 0;
                 else if (normRand < p_dot + p_1) runs = 1;
                 else if (normRand < p_dot + p_1 + p_2) runs = 2;
                 else if (normRand < p_dot + p_1 + p_2 + p_3) runs = 3;
                 else if (normRand < p_dot + p_1 + p_2 + p_3 + p_4) runs = 4;
                 else runs = 6;
                 
                 // Occasional "Chaos" Runs (Overthrows/Misfields)
                 if (runs === 0 && Math.random() < 0.02) {
                     runs = 1;
                     commentary = `Misfield! ${strikerDetails.name} steals a quick single.`;
                 } else if (runs === 1 && Math.random() < 0.01) {
                     runs = 2;
                     commentary = `Overthrows! Extra run taken.`;
                 }
                 
                 ballLabel = runs.toString();
                 if (!commentary) commentary = getCommentary(runs, false, strikerDetails.name, bowlerDetails.name);

                 if (tacticalNote) commentary = `${tacticalNote} ${commentary}`;

                 // --- INJURY SYSTEM ---
                 const triggerInjury = () => {
                     const baseChance = 0.003; // ~0.3% ball-by-ball chance
                     const fitness = strikerDetails.fitness || 100;
                     const fitnessMod = fitness < 70 ? 0.01 : 0;
                     
                     let actionMod = 0;
                     if (runs >= 2) actionMod += 0.005;
                     
                     const finalChance = baseChance + fitnessMod + actionMod;

                     if (Math.random() < finalChance) {
                         const severityRand = Math.random();
                         let injury: any = null;

                         if (severityRand < 0.003) { // Major
                             const seasons = Math.floor(Math.random() * 3) + 1;
                             injury = { type: 'Major', text: 'Severe ligament tear', dType: 'seasons', dVal: seasons };
                         } else if (severityRand < 0.05) { // Medium
                             injury = { type: 'Medium', text: 'Fracture', dType: 'seasons', dVal: 1 };
                         } else if (severityRand < 0.3) { // Short
                             injury = { type: 'Short', text: 'Hamstring pull', dType: 'matches', dVal: Math.floor(Math.random() * 4) + 2 };
                         } else { // Minor
                             injury = { type: 'Minor', text: 'Muscle strain', dType: 'matches', dVal: 1 };
                         }

                         if (injury) {
                             striker.injury = { durationType: injury.dType, durationValue: injury.dVal, text: injury.text };
                             newState.commentary.unshift(`⚠️ INJURY ALERT: ${strikerDetails.name} suffered a ${injury.text}. Recovery: ${injury.dVal} ${injury.dType}.`);
                             
                             if (injury.type !== 'Minor') {
                                 striker.isOut = true;
                                 striker.dismissalText = 'retired hurt';
                                 currentInning.wickets++;
                                 newState.fallOfWickets.push({ score: currentInning.score, wicket: currentInning.wickets, over: formatOvers(bowler.ballsBowled + (parseInt(currentInning.overs.split('.')[0]) * 6)), player: strikerDetails.name });
                                 // Next batter logic will be handled below by the standard wicket logic
                             }
                         }
                     }
                 };
                 triggerInjury();
             }

            const isT20Live = gameData.currentFormat.includes('T20') || gameData.currentFormat.includes('Premier T20 League');
            const isODILive = gameData.currentFormat.includes('One-Day') || gameData.currentFormat.includes('Premier One-Day Cup') || gameData.currentFormat.includes('Cup');
            const totalBallsInning = currentInning.bowling.reduce((sum, b) => sum + b.ballsBowled, 0) + 1;
            let currentPhase: 'pp' | 'mo' | 'do' | null = null;
            if (isT20Live) {
                if (totalBallsInning <= 36) currentPhase = 'pp';
                else if (totalBallsInning <= 90) currentPhase = 'mo';
                else currentPhase = 'do';
            } else if (isODILive) {
                if (totalBallsInning <= 60) currentPhase = 'pp';
                else if (totalBallsInning <= 240) currentPhase = 'mo';
                else currentPhase = 'do';
            }

            if (currentPhase) {
                const prefix = currentPhase;
                if (currentInning[`${prefix}Runs`] === undefined) currentInning[`${prefix}Runs`] = 0;
                if (currentInning[`${prefix}Wickets`] === undefined) currentInning[`${prefix}Wickets`] = 0;
                if (currentInning[`${prefix}Balls`] === undefined) currentInning[`${prefix}Balls`] = 0;
                if (currentInning[`${prefix}Dots`] === undefined) currentInning[`${prefix}Dots`] = 0;
                if (currentInning[`${prefix}Fours`] === undefined) currentInning[`${prefix}Fours`] = 0;
                if (currentInning[`${prefix}Sixes`] === undefined) currentInning[`${prefix}Sixes`] = 0;

                currentInning[`${prefix}Balls`]++;
                if (isOut) {
                    currentInning[`${prefix}Wickets`]++;
                } else {
                    currentInning[`${prefix}Runs`] += runs;
                    if (runs === 0) currentInning[`${prefix}Dots`]++;
                    else if (runs === 4) currentInning[`${prefix}Fours`]++;
                    else if (runs === 6) currentInning[`${prefix}Sixes`]++;
                }

                if (currentPhase === 'pp') {
                    striker.ppBalls = (striker.ppBalls || 0) + 1;
                    bowler.ppBallsBowled = (bowler.ppBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.ppDismissals = (striker.ppDismissals || 0) + 1;
                        bowler.ppWickets = (bowler.ppWickets || 0) + 1;
                    } else {
                        striker.ppRuns = (striker.ppRuns || 0) + runs;
                        bowler.ppRunsConceded = (bowler.ppRunsConceded || 0) + runs;
                    }
                } else if (currentPhase === 'mo') {
                    striker.moBalls = (striker.moBalls || 0) + 1;
                    bowler.moBallsBowled = (bowler.moBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.moDismissals = (striker.moDismissals || 0) + 1;
                        bowler.moWickets = (bowler.moWickets || 0) + 1;
                    } else {
                        striker.moRuns = (striker.moRuns || 0) + runs;
                        bowler.moRunsConceded = (bowler.moRunsConceded || 0) + runs;
                    }
                } else if (currentPhase === 'do') {
                    striker.doBalls = (striker.doBalls || 0) + 1;
                    bowler.doBallsBowled = (bowler.doBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.doDismissals = (striker.doDismissals || 0) + 1;
                        bowler.doWickets = (bowler.doWickets || 0) + 1;
                    } else {
                        striker.doRuns = (striker.doRuns || 0) + runs;
                        bowler.doRunsConceded = (bowler.doRunsConceded || 0) + runs;
                    }
                }
            }

            currentInning.score += runs;
            bowler.runsConceded += runs;
            bowler.ballsBowled++;
            const oldRuns = striker.runs;
            striker.runs += runs;
            striker.balls++;

            // --- MILESTONE DETECTION ---
            const triggerMilestone = (title: string, message: string, type: any, playerId: string) => {
                newState.milestoneEvent = { title, message, type, playerId };
                // Pause simulation for big milestones
                if (newState.autoPlayType === 'match' || newState.autoPlayType === 'inning') {
                     // We could pause or just let it flash. 
                     // User didn't specify pausing, but "celebration popups" imply visibility.
                }
            };

            const formats: Format[] = [Format.T20, Format.ODI, Format.SHIELD];
            const getCareerRuns = (p: Player) => {
                let total = 0;
                formats.forEach(f => total += (p.stats[f]?.runs || 0));
                return total;
            };
            const getCareerWickets = (p: Player) => {
                let total = 0;
                formats.forEach(f => total += (p.stats[f]?.wickets || 0));
                return total;
            };

            // Batting Milestones
            if (oldRuns < 50 && striker.runs >= 50) {
                triggerMilestone("FIFTY!", `${strikerDetails.name} reaches 50 runs.`, 'batting', strikerDetails.id);
                striker.ballsToFifty = striker.balls;
            } else if (oldRuns < 100 && striker.runs >= 100) {
                triggerMilestone("CENTURY!", `${strikerDetails.name} scores 100!`, 'batting', strikerDetails.id);
                striker.ballsToHundred = striker.balls;
            }

            // Career Batting Milestones
            const careerRunsBefore = getCareerRuns(strikerDetails);
            const careerRunsAfter = careerRunsBefore + runs;
            [1000, 2000, 5000].forEach(m => {
                if (careerRunsBefore < m && careerRunsAfter >= m) {
                    triggerMilestone("CAREER MILESTONE!", `${strikerDetails.name} completes ${m} career runs.`, 'career', strikerDetails.id);
                }
            });

            // Form Milestones
            const currentFormat = gameData.currentFormat;
            if (striker.runs >= 50 && oldRuns < 50) {
                const recentResults = gameData.matchResults[currentFormat]
                    .filter(r => {
                        const innings = [r.firstInning, r.secondInning, r.thirdInning, r.fourthInning].filter(Boolean);
                        return innings.some(inn => inn.batting.some(b => b.playerId === strikerDetails.id));
                    })
                    .slice(-11);
                
                const pastFifties = recentResults.filter(r => {
                    const innings = [r.firstInning, r.secondInning, r.thirdInning, r.fourthInning].filter(Boolean);
                    return innings.some(inn => {
                        const ps = inn.batting.find(b => b.playerId === strikerDetails.id);
                        return ps && ps.runs >= 50;
                    });
                }).length;
                
                if (pastFifties + 1 >= 3) {
                    triggerMilestone("HOT FORM!", `${strikerDetails.name} records his ${pastFifties + 1}th fifty in 12 games!`, 'batting', strikerDetails.id);
                }
            }

            // Tournament Leader Detection (Runs)
            const currentTourneyRuns = (strikerDetails.stats[currentFormat]?.runs || 0) + striker.runs;
            const otherPlayers = gameData.allPlayers.filter(p => p.id !== strikerDetails.id);
            const maxRunsExisting = Math.max(0, ...otherPlayers.map(p => p.stats[currentFormat]?.runs || 0));
            
            if (currentTourneyRuns > maxRunsExisting && careerRunsBefore + runs > maxRunsExisting) {
                // If they weren't the leader before this run
                const currentTourneyRunsBefore = currentTourneyRuns - runs;
                if (currentTourneyRunsBefore <= maxRunsExisting) {
                    triggerMilestone("TOURNAMENT LEADER!", `${strikerDetails.name} now has the most runs in the tournament!`, 'leader', strikerDetails.id);
                }
            }

            // Bowling Milestones (to be checked after results)
            
            newState.currentPartnership.runs += runs;
            newState.currentPartnership.balls++;

            if (runs === 4) striker.fours++;
            if (runs === 6) striker.sixes++;

            if (isOut) {
                currentInning.wickets++;
                const oldWickets = bowler.wickets;
                bowler.wickets++;
                striker.isOut = true;
                striker.dismissalText = `b ${bowlerDetails.name}`;

                // --- BOWLING MILESTONE DETECTION ---
                if (oldWickets < 3 && bowler.wickets === 3) {
                    triggerMilestone("3-WICKET HAUL!", `${bowlerDetails.name} takes 3 wickets.`, 'bowling', bowlerDetails.id);
                } else if (oldWickets < 5 && bowler.wickets === 5) {
                    triggerMilestone("FIVE-FOR!", `${bowlerDetails.name} takes 5 wickets!`, 'bowling', bowlerDetails.id);
                }

                // Career Bowling Milestones
                const careerWicketsBefore = getCareerWickets(bowlerDetails);
                const careerWicketsAfter = careerWicketsBefore + 1;
                [50, 100].forEach(m => {
                    if (careerWicketsBefore < m && careerWicketsAfter >= m) {
                        triggerMilestone("CAREER MILESTONE!", `${bowlerDetails.name} reaches ${m} career wickets.`, 'career', bowlerDetails.id);
                    }
                });

                // Tournament Leader Detection (Wickets)
                const currentTourneyWickets = (bowlerDetails.stats[currentFormat]?.wickets || 0) + bowler.wickets;
                const otherBowlers = gameData.allPlayers.filter(p => p.id !== bowlerDetails.id);
                const maxWicketsExisting = Math.max(0, ...otherBowlers.map(p => p.stats[currentFormat]?.wickets || 0));

                if (currentTourneyWickets > maxWicketsExisting) {
                    const currentTourneyWicketsBefore = currentTourneyWickets - 1;
                    if (currentTourneyWicketsBefore <= maxWicketsExisting) {
                        triggerMilestone("TOP WICKET TAKER!", `${bowlerDetails.name} leads the wicket charts!`, 'leader', bowlerDetails.id);
                    }
                }
                
                newState.fallOfWickets.push({
                    score: currentInning.score,
                    wicket: currentInning.wickets,
                    over: formatOvers(bowler.ballsBowled + (parseInt(currentInning.overs.split('.')[0]) * 6)),
                    player: strikerDetails.name
                });

                if (currentInning.wickets < 10) {
                     const isUserBattingNow = battingTeam.id === gameData.userTeamId;
                     if (isUserBattingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                         newState.waitingFor = 'batter'; 
                         stopAutoPlay();
                     } else {
                         // Auto Select Batter
                         const nextBatter = currentInning.batting.find(b => !b.isOut && b.playerId !== currentBatters.strikerId && b.playerId !== currentBatters.nonStrikerId);
                         if (nextBatter) {
                             newState.currentBatters.strikerId = nextBatter.playerId;
                             newState.commentary.unshift(`${nextBatter.playerName} comes to the crease.`);
                         }
                     }
                }
            } else {
                if (runs % 2 !== 0) {
                    const temp = currentBatters.strikerId;
                    currentBatters.strikerId = currentBatters.nonStrikerId;
                    currentBatters.nonStrikerId = temp;
                }
            }

            newState.ballByBallId = Math.random().toString();
            newState.lastBallSpeed = ballSpeed;

            newState.recentBalls = [ballLabel, ...newState.recentBalls].slice(0, 12);
            newState.commentary = [commentary, ...newState.commentary].slice(0, 50);

            const totalBalls = innings[currentInningIndex].bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
            currentInning.overs = formatOvers(totalBalls);
            bowler.overs = formatOvers(bowler.ballsBowled);

            const maxOvers = (gameData.currentFormat.includes('T20')) ? 20 : (gameData.currentFormat.includes('ODI') || gameData.currentFormat.includes('List')) ? 50 : 90;
            const maxBalls = maxOvers * 6;

            // End of Over Logic
            if (totalBalls % 6 === 0 && totalBalls < maxBalls) { 
                if (!isOut) {
                    const temp = currentBatters.strikerId;
                    currentBatters.strikerId = currentBatters.nonStrikerId;
                    currentBatters.nonStrikerId = temp;
                }
                
                newState.commentary.unshift(`End of over ${totalBalls/6}. ${battingTeam.name} are ${currentInning.score}/${currentInning.wickets}.`);
                
                if (currentInning.wickets < 10) {
                     const isUserBowlingNow = bowlingTeam.id === gameData.userTeamId;
                     if (isUserBowlingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                         newState.waitingFor = 'bowler';
                         stopAutoPlay(); 
                     } else {
                         // Auto Select Bowler
                         const overLimit = (gameData.currentFormat.includes('T20') ? 4 : 10);
                         const validBowlers = currentInning.bowling.filter(b => b.playerId !== currentBowlerId && b.ballsBowled < overLimit * 6);
                         
                         let nextBowler = validBowlers.sort((a,b) => {
                             const pa = getPlayerById(a.playerId, allPlayers);
                             const pb = getPlayerById(b.playerId, allPlayers);
                             return pb.secondarySkill - pa.secondarySkill;
                         })[0];

                         if (!nextBowler) {
                             nextBowler = currentInning.bowling.find(b => b.playerId !== currentBowlerId) || currentInning.bowling[0];
                         }

                         if (nextBowler) {
                            newState.currentBowlerId = nextBowler.playerId;
                            newState.commentary.unshift(`${nextBowler.playerName} will bowl the next over.`);
                         }
                     }
                }
            } else if (totalBalls % 6 === 0 && isOut && currentInning.wickets < 10) {
                // Double Event: Wicket on Last Ball
                const isUserBowlingNow = bowlingTeam.id === gameData.userTeamId;
                if (isUserBowlingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                     if (!newState.waitingFor) {
                         newState.waitingFor = 'bowler';
                         stopAutoPlay();
                     }
                } else {
                     // Auto Select Bowler
                     const overLimit = (gameData.currentFormat.includes('T20') ? 4 : 10);
                     const validBowlers = currentInning.bowling.filter(b => b.playerId !== currentBowlerId && b.ballsBowled < overLimit * 6);
                     const nextBowler = validBowlers[0] || currentInning.bowling.find(b => b.playerId !== currentBowlerId);
                     if (nextBowler) newState.currentBowlerId = nextBowler.playerId;
                }
            }

            let matchEnded = false;
            let resultText = "";

            if (currentInning.wickets >= 10 || totalBalls >= maxBalls || (target !== null && currentInning.score > target)) {
                newState.waitingFor = null;
                if (newState.autoPlayType !== 'match') stopAutoPlay();
                
                if (currentInningIndex === 0) {
                    newState.currentInningIndex = 1;
                    newState.target = currentInning.score;
                    newState.status = 'inprogress';
                    newState.battingTeam = bowlingTeam;
                    newState.bowlingTeam = battingTeam;
                    
                    const inn2Batters = innings[1].batting.slice(0, 2);
                    const inn2Bowler = innings[1].bowling[0];
                    
                    newState.currentBatters = { strikerId: inn2Batters[0]?.playerId || '', nonStrikerId: inn2Batters[1]?.playerId || '' };
                    newState.currentBowlerId = inn2Bowler?.playerId || '';
                    
                    newState.recentBalls = [];
                    newState.currentPartnership = { runs: 0, balls: 0 };
                    newState.commentary.unshift(`Innings Break! Target is ${currentInning.score + 1}.`);
                    
                    if (bowlingTeam.id === gameData.userTeamId && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                        newState.waitingFor = 'openers';
                    } else {
                         newState.commentary.unshift(`Auto-selected openers.`);
                         if (battingTeam.id === gameData.userTeamId && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                             newState.waitingFor = 'bowler';
                         }
                    }
                } else {
                    newState.status = 'completed';
                    matchEnded = true;
                    if (currentInning.score > target!) {
                        resultText = `${battingTeam.name} won by ${10 - currentInning.wickets} wickets`;
                    } else if (currentInning.score === target!) {
                        const maxBalls = (gameData.currentFormat.includes('T20')) ? 120 : (gameData.currentFormat.includes('ODI-Cup') || gameData.currentFormat.includes('One-Day') || gameData.currentFormat.includes('Cup')) ? 300 : 540;
                        const getInningBalls = (inn: Inning) => {
                            const parts = inn.overs.split('.');
                            return (parseInt(parts[0]) * 6) + (parseInt(parts[1]) || 0);
                        };
                        const ballsA = getInningBalls(innings[0]);
                        const ballsB = getInningBalls(innings[1]);
                        const remBallsA = maxBalls - ballsA;
                        const remBallsB = maxBalls - ballsB;
                        const remWktsA = 10 - innings[0].wickets;
                        const remWktsB = 10 - innings[1].wickets;

                        let tieWinnerId = '';
                        let tieReason = '';

                        if (remBallsB > remBallsA) {
                            tieWinnerId = battingTeam.id;
                            tieReason = `won by more balls remaining (${remBallsB} vs ${remBallsA})`;
                        } else if (remBallsA > remBallsB) {
                            tieWinnerId = bowlingTeam.id;
                            tieReason = `won by more balls remaining (${remBallsA} vs ${remBallsB})`;
                        } else if (remWktsB > remWktsA) {
                            tieWinnerId = battingTeam.id;
                            tieReason = `won by wickets remaining (${remWktsB} vs ${remWktsA})`;
                        } else if (remWktsA > remWktsB) {
                            tieWinnerId = bowlingTeam.id;
                            tieReason = `won by wickets remaining (${remWktsA} vs ${remWktsB})`;
                        } else {
                            const standings = gameData.standings[gameData.currentFormat];
                            const rankA = standings.findIndex(s => s.teamId === innings[0].teamId);
                            const rankB = standings.findIndex(s => s.teamId === innings[1].teamId);
                            if (rankB < rankA && rankB !== -1) {
                                tieWinnerId = battingTeam.id;
                                tieReason = "won by higher league standing";
                            } else {
                                tieWinnerId = bowlingTeam.id;
                                tieReason = rankA !== -1 ? "won by higher league standing" : "won by technicality";
                            }
                        }

                        const winnerName = tieWinnerId === battingTeam.id ? battingTeam.name : bowlingTeam.name;
                        resultText = `Match Tied - ${winnerName} ${tieReason}`;
                        newState.winId = tieWinnerId; // Temporary store for logic below
                    } else {
                        resultText = `${bowlingTeam.name} won by ${target! - currentInning.score} runs`;
                    }
                }
            }

            if (matchEnded) {
                stopAutoPlay(); // Ensure stopped
                
                // Identify Match Winner Performance
                const isTie = currentInning.score === target!;
                let winId = isTie ? newState.winId : (currentInning.score > target! ? battingTeam.id : bowlingTeam.id);
                delete newState.winId; // Cleanup temporary state
                
                const winnerBatters = innings[currentInningIndex].teamId === winId ? innings[currentInningIndex].batting : innings[0].batting;
                const winnerBowlers = innings[currentInningIndex].teamId === winId ? innings[currentInningIndex].bowling : innings[0].bowling;
                
                const bestBatter = [...winnerBatters].sort((a,b) => b.runs - a.runs)[0];
                const bestBowler = [...winnerBowlers].sort((a,b) => b.wickets - a.wickets)[0];
                
                if (bestBatter && bestBatter.runs >= 40) {
                   triggerMilestone("MATCH WINNING PERFORMANCE!", `${bestBatter.playerName} guides his team to victory with ${bestBatter.runs} runs!`, 'match_winner', bestBatter.playerId);
                } else if (bestBowler && bestBowler.wickets >= 3) {
                   triggerMilestone("MATCH WINNING SPELL!", `${bestBowler.playerName} takes ${bestBowler.wickets} wickets to clinch the win!`, 'match_winner', bestBowler.playerId);
                }

                const result: MatchResult = {
                    matchNumber: match.matchNumber,
                    summary: resultText,
                    firstInning: innings[0],
                    secondInning: innings[1],
                    winnerId: winId,
                    loserId: winId === battingTeam.id ? bowlingTeam.id : battingTeam.id,
                    manOfTheMatch: { playerId: '', playerName: 'TBD', teamId: '', summary: '' },
                    tossWinnerId: newState.tossWinnerId || undefined,
                    tossDecision: newState.tossDecision || undefined
                };
                let bestPerf = -1;
                [innings[0], innings[1]].forEach(inn => {
                    inn.batting.forEach(b => { if (b.runs > bestPerf) { bestPerf = b.runs; result.manOfTheMatch = { playerId: b.playerId, playerName: b.playerName, teamId: inn.teamId, summary: `${b.runs} runs` } } });
                });
                
                setTimeout(() => onMatchComplete(result), 2000);
            }

            return newState;
        });
    }, [state, allPlayers, gameData, groundPitch, onMatchComplete]);

    const playOver = () => {
        let balls = 0;
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        
        setState(prev => prev ? { ...prev, autoPlayType: 'regular' } : null);

        autoPlayRef.current = setInterval(() => {
            playBall();
            balls++;
            if (balls >= 6) {
                if (autoPlayRef.current) clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
                setState(prev => prev ? { ...prev, autoPlayType: null } : null);
            }
        }, 100);
    };

    const autoSimulate = () => {
        if (autoPlayRef.current) return;
        setState(prev => prev ? { ...prev, autoPlayType: 'regular' } : null);
        autoPlayRef.current = setInterval(() => {
            playBall();
        }, 50);
    };
    
    const simulateInning = () => {
         if (autoPlayRef.current) clearInterval(autoPlayRef.current);
         setState(prev => prev ? { ...prev, autoPlayType: 'inning' } : null);
         autoPlayRef.current = setInterval(() => {
            playBall();
        }, 10); 
    };

    const simulateMatch = () => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        setState(prev => prev ? { ...prev, autoPlayType: 'match' } : null);
        autoPlayRef.current = setInterval(() => {
           playBall();
       }, 5); 
   };
    
    useEffect(() => {
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, []);

    const setBattingStrategy = (playerId: string, s: Strategy) => setState(prev => prev ? { ...prev, strategies: { ...prev.strategies, batting: { ...prev.strategies.batting, [playerId]: s } } } : null);
    
    const togglePlaySafe = (batterId: string, bowlerId: string) => {
        setState(prev => {
            if (!prev) return null;
            const currentSafeList = prev.playSafeAgainst?.[batterId] || [];
            const isSafe = currentSafeList.includes(bowlerId);
            
            return {
                ...prev,
                playSafeAgainst: {
                    ...prev.playSafeAgainst,
                    [batterId]: isSafe 
                        ? currentSafeList.filter(id => id !== bowlerId)
                        : [...currentSafeList, bowlerId]
                }
            };
        });
    };
    const setBowlingStrategy = (s: Strategy) => setState(prev => prev ? { ...prev, strategies: { ...prev.strategies, bowling: s } } : null);
    const toggleExploitWeakness = (val: boolean) => setState(prev => prev ? { ...prev, isExploitingWeakness: val } : null);

    const selectOpeners = (strikerId: string, nonStrikerId: string) => {
        setState(prev => {
            if (!prev) return null;
            
            return {
                ...prev,
                currentBatters: { strikerId, nonStrikerId },
                currentPartnership: { runs: 0, balls: 0 },
                waitingFor: null,
            };
        });
    };

    const selectNextBatter = (batterId: string) => {
        setState(prev => {
            if (!prev) return null;
            const currentInning = prev.innings[prev.currentInningIndex];
            const strikerOut = currentInning.batting.find(b => b.playerId === prev.currentBatters.strikerId)?.isOut;
            
            const newBatters = { ...prev.currentBatters };
            if (strikerOut) newBatters.strikerId = batterId;
            else newBatters.nonStrikerId = batterId;

            const totalBalls = currentInning.bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
            let nextWaitingFor: LiveMatchState['waitingFor'] = null;
            let nextBowlerId = prev.currentBowlerId;
            
            if (totalBalls % 6 === 0 && totalBalls > 0) {
                 if (prev.bowlingTeam.id === gameData.userTeamId && prev.autoPlayType !== 'inning' && prev.autoPlayType !== 'match') {
                      nextWaitingFor = 'bowler';
                 } else {
                      const overLimit = (gameData.currentFormat.includes('T20') ? 4 : 10);
                      const validBowlers = currentInning.bowling.filter(b => b.playerId !== prev.currentBowlerId && b.ballsBowled < overLimit * 6);
                      
                      let nextBowler = validBowlers.sort((a,b) => {
                           const pa = getPlayerById(a.playerId, allPlayers);
                           const pb = getPlayerById(b.playerId, allPlayers);
                           return pb.secondarySkill - pa.secondarySkill;
                      })[0] || currentInning.bowling.find(b => b.playerId !== prev.currentBowlerId);
                      
                      if (nextBowler) nextBowlerId = nextBowler.playerId;
                 }
            }

            return {
                ...prev,
                currentBatters: newBatters, 
                currentBowlerId: nextBowlerId,
                currentPartnership: { runs: 0, balls: 0 },
                waitingFor: nextWaitingFor,
                commentary: [`${getPlayerById(batterId, allPlayers).name} is the new batter.`, ...prev.commentary]
            };
        });
    };

    const selectNextBowler = (bowlerId: string) => {
        setState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentBowlerId: bowlerId,
                waitingFor: null,
                commentary: [`${getPlayerById(bowlerId, allPlayers).name} comes into the attack.`, ...prev.commentary]
            };
        });
    };

    return {
        state,
        playBall,
        playOver,
        autoSimulate,
        simulateInning,
        simulateMatch,
        setBattingStrategy,
        setBowlingStrategy,
        togglePlaySafe,
        toggleExploitWeakness,
        selectOpeners,
        selectNextBatter,
        selectNextBowler,
        startMatch,
        proceedToMatch
    };
};
