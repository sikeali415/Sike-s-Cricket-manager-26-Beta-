
import React, { useCallback } from 'react';
import { GameData, Format, PlayerRole, PlayerStats, MatchResult, Inning, BattingPerformance, BowlingPerformance, Team, Match, Player } from '../types';
import { PITCH_MODIFIERS, formatOvers, getPlayerById, generateAutoXI, getBatterTier, BATTING_PROFILES } from '../utils';
import { generateSingleFormatInitialStats } from '../data';
import { getPlayerOfTheMatch } from '../utils/awardUtils';

export const useSimulation = (gameData: GameData, setGameData: React.Dispatch<React.SetStateAction<GameData | null>>) => {
    const simulateInning = useCallback((battingTeam: Team, bowlingTeam: Team, format: Format, target: number | null, pitch: string, groundCode: string, inningNumber: number, allPlayers: Player[], playerForms: Record<string, number>): Inning => {
        const pitchMods = PITCH_MODIFIERS[pitch as keyof typeof PITCH_MODIFIERS] || PITCH_MODIFIERS["Balanced Sporting Pitch"];
        const formatMods = pitchMods[format];
        let score = 0, wickets = 0, balls = 0, extras = 0;
        
        const isT20 = format.includes('T20');
        const isODI = format.includes('One-Day') || format.includes('List-A');
        const maxBalls = (isT20 ? 20 : isODI ? 50 : 90) * 6;
        
        let limits: any = null;
        const groundLimits = gameData.scoreLimits?.[groundCode];
        if (groundLimits) {
            const formatLimits = groundLimits[format];
            if (formatLimits) {
                limits = formatLimits[inningNumber];
            }
        }
        const maxWicketsForInning = (limits?.maxWickets && limits.maxWickets > 0 && limits.maxWickets <= 10) ? limits.maxWickets : 10;

        const battingLineup: BattingPerformance[] = battingTeam.squad.map((p, idx) => { 
            const d = getPlayerById(p.id, allPlayers); 
            return { 
                playerId: d.id, 
                playerName: d.name, 
                runs: 0, 
                balls: 0, 
                fours: 0, 
                sixes: 0, 
                isOut: false, 
                dismissalText: 'not out', 
                dismissal: { type: 'not out', bowlerId: '' }, 
                ballsToFifty: 0, 
                ballsToHundred: 0,
                ppRuns: 0, ppBalls: 0, ppDismissals: 0,
                moRuns: 0, moBalls: 0, moDismissals: 0,
                doRuns: 0, doBalls: 0, doDismissals: 0,
                battingPosition: idx + 1
            }; 
        });
        
        const bowlingLineup = bowlingTeam.squad
            .filter(p => getPlayerById(p.id, allPlayers).role !== PlayerRole.WICKET_KEEPER)
            .map(p => { 
                const d = getPlayerById(p.id, allPlayers); 
                return { 
                    playerId: d.id, 
                    playerName: d.name, 
                    overs: '0.0', 
                    maidens: 0, 
                    runsConceded: 0, 
                    wickets: 0, 
                    ballsBowled: 0,
                    role: d.role,
                    skill: d.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                } 
            });
        
        if (bowlingLineup.length < 2) { 
            const p1 = getPlayerById(bowlingTeam.squad[0].id, allPlayers);
            const p2 = getPlayerById(bowlingTeam.squad[1]?.id || bowlingTeam.squad[0].id, allPlayers);
            if (bowlingLineup.length === 0) {
                bowlingLineup.push({ 
                    playerId: p1.id, playerName: p1.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0, role: p1.role, skill: p1.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                });
            }
            if (bowlingLineup.length === 1) {
                bowlingLineup.push({ 
                    playerId: p2.id, playerName: p2.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0, role: p2.role, skill: p2.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                });
            }
        }

        let onStrikeBatterIndex = 0, offStrikeBatterIndex = 1, bowlerIndex = 0, runsThisOver = 0;

        while (balls < maxBalls && wickets < maxWicketsForInning) {
            if (target && score >= target) break;
            if (limits?.maxRuns && limits.maxRuns > 0 && score >= limits.maxRuns) break;

            const onStrikeBatter = battingLineup[onStrikeBatterIndex];
            if (!onStrikeBatter) break; 
            const onStrikeBatterDetails = getPlayerById(onStrikeBatter.playerId, allPlayers);
            const currentBowler = bowlingLineup[bowlerIndex];
            const bowlerDetails = getPlayerById(currentBowler.playerId, allPlayers);

            const batterForm = playerForms[onStrikeBatterDetails.id] || 1.0;
            const bowlerForm = playerForms[bowlerDetails.id] || 1.0;
            const batterFatigue = Math.max(0.75, 1 - (onStrikeBatter.balls / 250)) * batterForm;
            const bowlerFatigue = Math.max(0.7, 1 - (currentBowler.ballsBowled / 150)) * bowlerForm;

            let pressureFactor = 1.0;
            let aggressionFactor = 1.0;
            
            if (target) {
                const remainingBalls = maxBalls - balls;
                const remainingRuns = target - score;
                if (remainingBalls > 0) {
                    const requiredRR = (remainingRuns / remainingBalls) * 6;
                    if (isT20) {
                        if (requiredRR > 12) aggressionFactor = 1.6;
                        else if (requiredRR > 10) aggressionFactor = 1.4;
                        else if (requiredRR > 8) aggressionFactor = 1.25;
                        else if (requiredRR < 6) aggressionFactor = 0.95;
                    } else if (isODI) {
                        if (requiredRR > 10) aggressionFactor = 1.5;
                        else if (requiredRR > 8) aggressionFactor = 1.3;
                        else if (requiredRR > 6) aggressionFactor = 1.15;
                        else if (requiredRR < 4) aggressionFactor = 0.85;
                    }
                    const skillClutchness = (onStrikeBatterDetails.battingSkill - 60) / 100;
                    if (requiredRR > 9) {
                        const basePressure = (requiredRR - 9) * 0.06;
                        pressureFactor = 1 + Math.max(0, basePressure - skillClutchness);
                    }
                }
            } else {
                const progress = balls / maxBalls;
                if (isT20) {
                    if (progress > 0.8) aggressionFactor = 1.4;
                    else if (progress > 0.5) aggressionFactor = 1.15;
                    else if (progress < 0.3) aggressionFactor = 1.05;
                } else if (isODI) {
                    if (progress > 0.9) aggressionFactor = 1.5;
                    else if (progress > 0.7) aggressionFactor = 1.2;
                    else if (progress < 0.2) aggressionFactor = 1.1;
                }
            }

            let batterProfile;
            const customProfile = onStrikeBatterDetails.customProfiles?.[format];
            if (customProfile && customProfile.avg > 0 && customProfile.sr > 0) {
                batterProfile = customProfile;
            } else {
                const batterTier = getBatterTier(onStrikeBatterDetails.battingSkill * batterFatigue);
                const batterStyle = onStrikeBatterDetails.style;
                // @ts-ignore
                batterProfile = BATTING_PROFILES[format][batterTier][batterStyle] || BATTING_PROFILES[format][batterTier]['N'];
            }

            let effectiveChasePenalty = target !== null ? pitchMods.chasePenalty : 1;
            if (target && aggressionFactor > 1.3) effectiveChasePenalty = 1.0;
            const expectedRunsPerBall = (batterProfile.sr / 100) * aggressionFactor * effectiveChasePenalty;
            const riskMitigation = (onStrikeBatterDetails.battingSkill - 50) / 100;
            const aggressionWicketPenalty = Math.max(1.0, aggressionFactor - riskMitigation);
            const baseWicketProb = batterProfile.avg > 0 ? (expectedRunsPerBall / aggressionFactor / batterProfile.avg) * aggressionWicketPenalty : 0.05;
            
            let wicketProbability = (baseWicketProb * pressureFactor)
                + (((bowlerDetails.secondarySkill * bowlerFatigue) - (onStrikeBatterDetails.battingSkill * batterFatigue)) / 600) 
                + (bowlerDetails.role === PlayerRole.FAST_BOWLER ? pitchMods.paceBonus / 2 : 0) 
                + (bowlerDetails.role === PlayerRole.SPIN_BOWLER ? pitchMods.spinBonus / 2 : 0);
            
            wicketProbability *= formatMods.wicketChance;
            if (!format.includes('First-Class')) {
                if (target) {
                    if (score < 50) wicketProbability *= 0.05;
                    else if (score < 120) wicketProbability *= 0.35;
                } else {
                    if (score < 40) wicketProbability *= 0.1;
                    else if (score < 80) wicketProbability *= 0.4;
                    else if (balls < 60 && score < 100) wicketProbability *= 0.7;
                }
            }
            if (format.includes('First-Class')) wicketProbability *= 0.8;
            else if (isT20) wicketProbability *= 1.1;

            wicketProbability = Math.max(0.004, Math.min(0.4, wicketProbability));

            balls++;
            onStrikeBatter.balls++;
            currentBowler.ballsBowled++;

            let currentPhase: 'pp' | 'mo' | 'do' | null = null;
            if (isT20) {
                if (balls <= 36) currentPhase = 'pp';
                else if (balls <= 96) currentPhase = 'mo';
                else currentPhase = 'do';
            } else if (isODI) {
                if (balls <= 60) currentPhase = 'pp';
                else if (balls <= 240) currentPhase = 'mo';
                else currentPhase = 'do';
            }

            if (currentPhase) {
                if (currentPhase === 'pp') {
                    onStrikeBatter.ppBalls = (onStrikeBatter.ppBalls || 0) + 1;
                    currentBowler.ppBallsBowled = (currentBowler.ppBallsBowled || 0) + 1;
                } else if (currentPhase === 'mo') {
                    onStrikeBatter.moBalls = (onStrikeBatter.moBalls || 0) + 1;
                    currentBowler.moBallsBowled = (currentBowler.moBallsBowled || 0) + 1;
                } else if (currentPhase === 'do') {
                    onStrikeBatter.doBalls = (onStrikeBatter.doBalls || 0) + 1;
                    currentBowler.doBallsBowled = (currentBowler.doBallsBowled || 0) + 1;
                }
            }

            let runsScored = 0;
            let isWicket = false;
            
            if (Math.random() < wicketProbability) {
                isWicket = true;
            } else {
                const rand = Math.random();
                let p_dot=0.32, p_1=0.40, p_2=0.08, p_3=0.02, p_4=0.12, p_6=0.06;
                if (format.includes('First-Class')) {
                    p_dot = 0.70; p_1 = 0.22; p_2 = 0.03; p_3 = 0.01; p_4 = 0.04; p_6 = 0.00;
                } else if (isT20) {
                    p_dot = 0.30; p_1 = 0.40; p_2 = 0.08; p_3 = 0.02; p_4 = 0.12; p_6 = 0.08;
                } else if (isODI) {
                    p_dot = 0.35; p_1 = 0.42; p_2 = 0.09; p_3 = 0.02; p_4 = 0.08; p_6 = 0.04;
                }
                const skillDiff = (onStrikeBatterDetails.battingSkill * batterFatigue - bowlerDetails.secondarySkill * bowlerFatigue) / 100;
                p_dot -= skillDiff * 0.1; p_4 += skillDiff * 0.05; p_6 += skillDiff * 0.03;
                if (!target && !format.includes('First-Class') && score < 70) {
                    p_dot *= 0.6; p_4 *= 1.5; p_6 *= 2.0;
                }
                if (aggressionFactor > 1.2) { p_dot *= 0.8; p_4 *= 1.4; p_6 *= 1.6; }
                else if (aggressionFactor < 0.9) { p_dot *= 1.4; p_4 *= 0.7; p_6 *= 0.5; }
                const totalP = p_dot + p_1 + p_2 + p_3 + p_4 + p_6;
                const normRand = rand * totalP;
                if (normRand < p_dot) runsScored = 0;
                else if (normRand < p_dot + p_1) runsScored = 1;
                else if (normRand < p_dot + p_1 + p_2) runsScored = 2;
                else if (normRand < p_dot + p_1 + p_2 + p_3) runsScored = 3;
                else if (normRand < p_dot + p_1 + p_2 + p_3 + p_4) runsScored = 4;
                else runsScored = 6;
                if (runsScored === 0 && Math.random() < 0.02 && !format.includes('First-Class')) runsScored = 1;
            }

            if (isWicket) {
                wickets++;
                onStrikeBatter.isOut = true;
                onStrikeBatter.dismissal = { type: 'bowled', bowlerId: currentBowler.playerId };
                onStrikeBatter.dismissalText = `b ${currentBowler.playerName}`;
                currentBowler.wickets++;
                if (currentPhase) {
                    if (currentPhase === 'pp') { onStrikeBatter.ppDismissals = (onStrikeBatter.ppDismissals || 0) + 1; currentBowler.ppWickets = (currentBowler.ppWickets || 0) + 1; }
                    else if (currentPhase === 'mo') { onStrikeBatter.moDismissals = (onStrikeBatter.moDismissals || 0) + 1; currentBowler.moWickets = (currentBowler.moWickets || 0) + 1; }
                    else if (currentPhase === 'do') { onStrikeBatter.doDismissals = (onStrikeBatter.doDismissals || 0) + 1; currentBowler.doWickets = (currentBowler.doWickets || 0) + 1; }
                }
                onStrikeBatterIndex = Math.max(onStrikeBatterIndex, offStrikeBatterIndex) + 1;
            } else {
                const oldRuns = onStrikeBatter.runs;
                onStrikeBatter.runs += runsScored;
                if (oldRuns < 50 && onStrikeBatter.runs >= 50 && !onStrikeBatter.ballsToFifty) { onStrikeBatter.ballsToFifty = onStrikeBatter.balls; }
                if (oldRuns < 100 && onStrikeBatter.runs >= 100 && !onStrikeBatter.ballsToHundred) { onStrikeBatter.ballsToHundred = onStrikeBatter.balls; }
                score += runsScored; currentBowler.runsConceded += runsScored; runsThisOver += runsScored;
                if (runsScored === 4) onStrikeBatter.fours++;
                if (runsScored === 6) onStrikeBatter.sixes++;
                if (currentPhase) {
                    if (currentPhase === 'pp') { onStrikeBatter.ppRuns = (onStrikeBatter.ppRuns || 0) + runsScored; currentBowler.ppRunsConceded = (currentBowler.ppRunsConceded || 0) + runsScored; }
                    else if (currentPhase === 'mo') { onStrikeBatter.moRuns = (onStrikeBatter.moRuns || 0) + runsScored; currentBowler.moRunsConceded = (currentBowler.moRunsConceded || 0) + runsScored; }
                    else if (currentPhase === 'do') { onStrikeBatter.doRuns = (onStrikeBatter.doRuns || 0) + runsScored; currentBowler.doRunsConceded = (currentBowler.doRunsConceded || 0) + runsScored; }
                }
                if (runsScored % 2 !== 0) { [onStrikeBatterIndex, offStrikeBatterIndex] = [offStrikeBatterIndex, onStrikeBatterIndex]; }
            }

            if (balls % 6 === 0) {
                if (runsThisOver === 0) currentBowler.maidens++;
                runsThisOver = 0;
                [onStrikeBatterIndex, offStrikeBatterIndex] = [offStrikeBatterIndex, onStrikeBatterIndex];
                const maxOversPerBowler = isT20 ? 4 : isODI ? 10 : Infinity;
                const lastBowlerIndex = bowlerIndex;
                let bestNextBowlerIndex = -1; let bestScore = -Infinity;
                for (let i = 0; i < bowlingLineup.length; i++) {
                    if (i === lastBowlerIndex) continue;
                    if (bowlingLineup[i].ballsBowled >= maxOversPerBowler * 6) continue;
                    const b = bowlingLineup[i]; let bScore = b.skill;
                    if (wickets < 5) { if (b.role === PlayerRole.FAST_BOWLER) bScore += 10; } else { if (b.role === PlayerRole.SPIN_BOWLER) bScore += 5; }
                    bScore -= (b.ballsBowled / 6) * 2; bScore += Math.random() * 10;
                    if (bScore > bestScore) { bestScore = bScore; bestNextBowlerIndex = i; }
                }
                if (bestNextBowlerIndex !== -1) bowlerIndex = bestNextBowlerIndex;
                else bowlerIndex = (lastBowlerIndex + 1) % bowlingLineup.length;
            }
        }
        return { 
            teamId: battingTeam.id, teamName: battingTeam.name, score, wickets, overs: formatOvers(balls), extras, 
            batting: battingLineup.slice(0, Math.min(battingLineup.length, wickets + 2)), 
            bowling: bowlingLineup.map(b => ({...b, overs: formatOvers(b.ballsBowled)})) 
        };
    }, [gameData.scoreLimits]);

    const runLimitedOversMatchSimulation = useCallback((match: Match, teamAPlayers: Player[], teamBPlayers: Player[], gameData: GameData): MatchResult => {
        const teamAData = gameData.teams.find(t => t.name === match.teamA); 
        const teamBData = gameData.teams.find(t => t.name === match.teamB);
        if(!teamAData || !teamBData) throw new Error(`Could not find team data`);
        const teamA = { ...teamAData, squad: teamAPlayers }; 
        const teamB = { ...teamBData, squad: teamBPlayers };
        const homeGround = gameData.grounds.find(g => g.code === gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround); 
        const pitch = homeGround?.pitch || "Balanced Sporting Pitch";
        const playerForms: Record<string, number> = {};
        [...teamAPlayers, ...teamBPlayers].forEach(p => playerForms[p.id] = 0.9 + (Math.random() * 0.2));

        const firstInning = simulateInning(teamA, teamB, gameData.currentFormat, null, pitch, homeGround?.code || 'KCG', 1, [...teamAPlayers, ...teamBPlayers], playerForms);
        const secondInning = simulateInning(teamB, teamA, gameData.currentFormat, firstInning.score, pitch, homeGround?.code || 'KCG', 2, [...teamAPlayers, ...teamBPlayers], playerForms);

        let winnerId: string | null = null, loserId: string | null = null, summary = '';
        if (secondInning.score > firstInning.score) { 
            winnerId = teamB.id; loserId = teamA.id; summary = `${teamB.name} won by ${10 - secondInning.wickets} wickets.`; 
        } else if (firstInning.score > secondInning.score) { 
            winnerId = teamA.id; loserId = teamB.id; summary = `${teamA.name} won by ${firstInning.score - secondInning.score} runs.`; 
        } else { 
            const isT20 = gameData.currentFormat.includes('T20');
            const maxBalls = (isT20 ? 20 : 50) * 6;
            
            const getInningBalls = (inn: Inning) => {
                const parts = inn.overs.split('.');
                return (parseInt(parts[0]) * 6) + (parseInt(parts[1]) || 0);
            };
            
            const ballsA = getInningBalls(firstInning);
            const ballsB = getInningBalls(secondInning);
            const remBallsA = maxBalls - ballsA;
            const remBallsB = maxBalls - ballsB;
            const remWktsA = 10 - firstInning.wickets;
            const remWktsB = 10 - secondInning.wickets;

            let tieWinnerId = '';
            let tieReason = '';

            if (remBallsB > remBallsA) {
                tieWinnerId = teamB.id;
                tieReason = `won by more balls remaining (${remBallsB} vs ${remBallsA})`;
            } else if (remBallsA > remBallsB) {
                tieWinnerId = teamA.id;
                tieReason = `won by more balls remaining (${remBallsA} vs ${remBallsB})`;
            } else if (remWktsB > remWktsA) {
                tieWinnerId = teamB.id;
                tieReason = `won by wickets remaining (${remWktsB} vs ${remWktsA})`;
            } else if (remWktsA > remWktsB) {
                tieWinnerId = teamA.id;
                tieReason = `won by wickets remaining (${remWktsA} vs ${remWktsB})`;
            } else {
                const standings = gameData.standings[gameData.currentFormat];
                const rankA = standings.findIndex(s => s.teamId === teamA.id);
                const rankB = standings.findIndex(s => s.teamId === teamB.id);
                if (rankB < rankA && rankB !== -1) {
                    tieWinnerId = teamB.id;
                    tieReason = "won by higher league standing";
                } else {
                    tieWinnerId = teamA.id;
                    tieReason = "won by better standing";
                }
            }

            winnerId = tieWinnerId;
            loserId = tieWinnerId === teamA.id ? teamB.id : teamA.id;
            const winnerName = winnerId === teamA.id ? teamA.name : teamB.name;
            summary = `Match Tied - ${winnerName} ${tieReason}`;
        }

        const result: MatchResult = { matchNumber: match.matchNumber, winnerId, loserId, summary, firstInning, secondInning, manOfTheMatch: { playerId: '', playerName: '', teamId: '', summary: '' } };
        result.manOfTheMatch = getPlayerOfTheMatch(result);
        return result;
    }, [simulateInning]);

    const runFirstClassMatchSimulation = useCallback((match: Match, teamAPlayers: Player[], teamBPlayers: Player[], gameData: GameData): MatchResult => {
        const teamAData = gameData.teams.find(t => t.name === match.teamA); 
        const teamBData = gameData.teams.find(t => t.name === match.teamB);
        const teamA = { ...teamAData!, squad: teamAPlayers }; 
        const teamB = { ...teamBData!, squad: teamBPlayers };
        const homeGround = gameData.grounds.find(g => g.code === gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround);
        const playerForms = {}; [...teamAPlayers, ...teamBPlayers].forEach(p => playerForms[p.id] = 0.9 + (Math.random() * 0.2));

        const firstInning = simulateInning(teamA, teamB, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 1, [...teamAPlayers, ...teamBPlayers], playerForms);
        const secondInning = simulateInning(teamB, teamA, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 2, [...teamAPlayers, ...teamBPlayers], playerForms);
        const thirdInning = simulateInning(teamA, teamB, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 3, [...teamAPlayers, ...teamBPlayers], playerForms);
        const target = (firstInning.score + thirdInning.score - secondInning.score) + 1;
        const fourthInning = simulateInning(teamB, teamA, gameData.currentFormat, target, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 4, [...teamAPlayers, ...teamBPlayers], playerForms);

        let winnerId: string | null = null, loserId: string | null = null, summary = '';
        if (fourthInning.score >= target) { 
            winnerId = teamB.id; loserId = teamA.id; summary = `${teamB.name} won by ${10 - fourthInning.wickets} wickets.`; 
        } else if (fourthInning.wickets >= 10) { 
            const isTie = fourthInning.score === (target - 1);
            if (isTie) {
                const maxBalls = 540; // 90 overs
                const getInningBalls = (inn: Inning) => {
                    const parts = inn.overs.split('.');
                    return (parseInt(parts[0]) * 6) + (parseInt(parts[1]) || 0);
                };
                // In FC, we compare 4th vs 3rd? Or total balls used in match?
                // Rule usually applies to the deciding innings
                // Let's keep it consistent: match-wide or inning specific?
                // "first remaining balls": usually implies the team that made more progress with fewer resources
                const ballsUsedA = getInningBalls(thirdInning); // Third inning is Team A's last
                const ballsUsedB = getInningBalls(fourthInning); // Fourth inning is Team B's last
                
                const wktsLostA = thirdInning.wickets;
                const wktsLostB = fourthInning.wickets;

                let tieWinnerId = '';
                let tieReason = '';

                if (maxBalls - ballsUsedB > maxBalls - ballsUsedA) {
                    tieWinnerId = teamB.id;
                    tieReason = "won by balls remaining";
                } else if (maxBalls - ballsUsedA > maxBalls - ballsUsedB) {
                    tieWinnerId = teamA.id;
                    tieReason = "won by balls remaining";
                } else if ((10 - wktsLostB) > (10 - wktsLostA)) {
                    tieWinnerId = teamB.id;
                    tieReason = "won by higher wickets remaining";
                } else {
                    const standings = gameData.standings[gameData.currentFormat];
                    const rankA = standings.findIndex(s => s.teamId === teamA.id);
                    const rankB = standings.findIndex(s => s.teamId === teamB.id);
                    if (rankB < rankA && rankB !== -1) tieWinnerId = teamB.id;
                    else tieWinnerId = teamA.id;
                    tieReason = "won by standing";
                }
                
                winnerId = tieWinnerId;
                loserId = winnerId === teamA.id ? teamB.id : teamA.id;
                const winnerName = winnerId === teamA.id ? teamA.name : teamB.name;
                summary = `Match Tied - ${winnerName} ${tieReason}`;
            } else {
                winnerId = teamA.id; loserId = teamB.id; summary = `${teamA.name} won by ${target - 1 - fourthInning.score} runs.`; 
            }
        } else { summary = 'Match Drawn.'; winnerId = null; loserId = null; }

        const result: MatchResult = { matchNumber: match.matchNumber, winnerId, loserId, summary, firstInning, secondInning, thirdInning, fourthInning, manOfTheMatch: { playerId: '', playerName: '', teamId: '', summary: '' } };
        result.manOfTheMatch = getPlayerOfTheMatch(result);
        return result;
    }, [simulateInning]);

    const runSimulationForCurrentFormat = useCallback((match: Match, gameData: GameData) => {
        const teamAData = gameData.teams.find(t => t.name === match.teamA); 
        const teamBData = gameData.teams.find(t => t.name === match.teamB);
        const getXI = (t: Team) => gameData.playingXIs[t.id]?.[gameData.currentFormat]?.map(id => t.squad.find(p => p.id === id)).filter(Boolean) as Player[] || generateAutoXI(t.squad, gameData.currentFormat);
        const pA = getXI(teamAData!); const pB = getXI(teamBData!);
        return (gameData.currentFormat.includes('First-Class')) ? runFirstClassMatchSimulation(match, pA, pB, gameData) : runLimitedOversMatchSimulation(match, pA, pB, gameData);
    }, [runLimitedOversMatchSimulation, runFirstClassMatchSimulation]);

    const updateStatsFromMatch = useCallback((result: MatchResult, format: Format, gameData: GameData): GameData => {
        const newGameData = JSON.parse(JSON.stringify(gameData)) as GameData;
        const allInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(Boolean) as Inning[];
        const isT20OrODI = format.includes('T20') || format.includes('One-Day') || format.includes('List-A');

        // Helpers to resolve team names and opposition
        const teamA = newGameData.teams.find(t => t.id === result.firstInning.teamId);
        const teamB = newGameData.teams.find(t => t.id === result.secondInning.teamId);

        if (teamA && teamB) {
            if (!newGameData.records?.teamVsTeam) {
                newGameData.records = {
                    ...newGameData.records,
                    teamVsTeam: []
                };
            }
            let tvt = newGameData.records.teamVsTeam.find(
                r => (r.teamAId === teamA.id && r.teamBId === teamB.id) || 
                     (r.teamAId === teamB.id && r.teamBId === teamA.id)
            );
            if (!tvt) {
                tvt = {
                    teamAId: teamA.id,
                    teamBId: teamB.id,
                    teamAName: teamA.name,
                    teamBName: teamB.name,
                    matches: 0,
                    teamAWins: 0
                };
                newGameData.records.teamVsTeam.push(tvt);
            }
            tvt.matches += 1;
            if (result.winnerId === teamA.id) {
                if (tvt.teamAId === teamA.id) tvt.teamAWins += 1;
            } else if (result.winnerId === teamB.id) {
                if (tvt.teamAId === teamB.id) tvt.teamAWins += 1;
            }
        }

        const getOpponentTeam = (inningTeamId: string) => {
            const oppId = (inningTeamId === result.firstInning.teamId) ? result.secondInning.teamId : result.firstInning.teamId;
            return newGameData.teams.find(t => t.id === oppId);
        };

        for (const inning of allInnings) {
            // Batting performance updates
            for (const batPerf of inning.batting) { 
                const player = newGameData.allPlayers.find(p => p.id === batPerf.playerId); if (!player) continue; 
                if (!player.stats[format]) player.stats[format] = generateSingleFormatInitialStats();
                const season = newGameData.currentSeason;
                if (!player.seasonStats) player.seasonStats = {};
                if (!player.seasonStats[season]) player.seasonStats[season] = {} as Record<Format, PlayerStats>;
                if (!player.seasonStats[season][format]) player.seasonStats[season][format] = generateSingleFormatInitialStats();
                
                const statsArr = [player.stats[format], player.seasonStats[season][format]];
                
                for (const stats of statsArr) {
                    stats.matches += (inning === result.firstInning || (inning === result.secondInning && !result.thirdInning) ? 1 : 0); 
                    stats.inningsBatting += 1;
                    stats.runs += batPerf.runs; 
                    stats.ballsFaced += batPerf.balls; 
                    if (batPerf.isOut) stats.dismissals++; 
                    if (batPerf.runs > stats.highestScore) stats.highestScore = batPerf.runs; 
                    
                    if (batPerf.runs >= 100) {
                        stats.hundreds++;
                    } else if (batPerf.runs >= 50) {
                        stats.fifties++;
                    } else if (batPerf.runs >= 30) {
                        stats.thirties++;
                    }

                    if (batPerf.runs >= 50 && batPerf.balls > 0) {
                        if (stats.fastestFifty === 0 || batPerf.balls < stats.fastestFifty) {
                            stats.fastestFifty = batPerf.balls;
                        }
                    }
                    if (batPerf.runs >= 100 && batPerf.balls > 0) {
                        if (stats.fastestHundred === 0 || batPerf.balls < stats.fastestHundred) {
                            stats.fastestHundred = batPerf.balls;
                        }
                    }

                    stats.fours += batPerf.fours; 
                    stats.sixes += batPerf.sixes; 
                    stats.average = stats.dismissals > 0 ? stats.runs / stats.dismissals : stats.runs; 
                    stats.strikeRate = stats.ballsFaced > 0 ? (stats.runs / stats.ballsFaced) * 100 : 0;

                    // Phase Stats
                    if (!stats.phaseStats) {
                        stats.phaseStats = {
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
                    }
                    if (!stats.phaseStats.batting) {
                        stats.phaseStats.batting = {
                            pp: { runs: 0, balls: 0, dismissals: 0 },
                            mo: { runs: 0, balls: 0, dismissals: 0 },
                            do: { runs: 0, balls: 0, dismissals: 0 }
                        };
                    }

                    const pb = stats.phaseStats.batting;
                    pb.pp.runs += batPerf.ppRuns || 0;
                    pb.pp.balls += batPerf.ppBalls || 0;
                    pb.pp.dismissals += batPerf.ppDismissals || 0;

                    pb.mo.runs += batPerf.moRuns || 0;
                    pb.mo.balls += batPerf.moBalls || 0;
                    pb.mo.dismissals += batPerf.moDismissals || 0;

                    pb.do.runs += batPerf.doRuns || 0;
                    pb.do.balls += batPerf.doBalls || 0;
                    pb.do.dismissals += batPerf.doDismissals || 0;

                    // Position Stats
                    if (batPerf.battingPosition && batPerf.battingPosition >= 1 && batPerf.battingPosition <= 11) {
                        if (!stats.positionStats) stats.positionStats = {};
                        const pos = batPerf.battingPosition;
                        if (!stats.positionStats[pos]) {
                            stats.positionStats[pos] = {
                                innings: 0,
                                runs: 0,
                                balls: 0,
                                dismissals: 0,
                                thirties: 0,
                                fifties: 0,
                                hundreds: 0
                            };
                        }
                        const ps = stats.positionStats[pos];
                        ps.innings += 1;
                        ps.runs += batPerf.runs;
                        ps.balls += batPerf.balls;
                        if (batPerf.isOut) ps.dismissals += 1;
                        if (batPerf.runs >= 100) ps.hundreds += 1;
                        else if (batPerf.runs >= 50) ps.fifties += 1;
                        else if (batPerf.runs >= 30) ps.thirties += 1;
                    }
                }

                // Player Vs Team Batting Records
                const oppTeam = getOpponentTeam(inning.teamId);
                if (oppTeam) {
                    if (!newGameData.records?.playerVsTeam) newGameData.records = { ...newGameData.records, playerVsTeam: [] };
                    let pvt = newGameData.records.playerVsTeam.find(r => r.playerId === batPerf.playerId && r.vsTeamId === oppTeam.id);
                    if (!pvt) {
                        pvt = {
                            playerId: batPerf.playerId,
                            playerName: batPerf.playerName,
                            playerRole: player.role,
                            vsTeamId: oppTeam.id,
                            vsTeamName: oppTeam.name,
                            runs: 0,
                            balls: 0,
                            dismissals: 0,
                            wickets: 0,
                            runsConceded: 0,
                            ballsBowled: 0
                        };
                        newGameData.records.playerVsTeam.push(pvt);
                    }
                    pvt.runs += batPerf.runs;
                    pvt.balls += batPerf.balls;
                    if (batPerf.isOut) pvt.dismissals += 1;
                }
            }

            // Bowling performance updates
            for (const bowlPerf of inning.bowling) { 
                const player = newGameData.allPlayers.find(p => p.id === bowlPerf.playerId); if (!player) continue; 
                if (!player.stats[format]) player.stats[format] = generateSingleFormatInitialStats();
                const season = newGameData.currentSeason;
                if (!player.seasonStats) player.seasonStats = {};
                if (!player.seasonStats[season]) player.seasonStats[season] = {} as Record<Format, PlayerStats>;
                if (!player.seasonStats[season][format]) player.seasonStats[season][format] = generateSingleFormatInitialStats();
                
                const statsArr = [player.stats[format], player.seasonStats[season][format]];
                
                for (const stats of statsArr) {
                    stats.inningsBowling += (bowlPerf.ballsBowled > 0 ? 1 : 0);
                    stats.wickets += bowlPerf.wickets; 
                    stats.runsConceded += bowlPerf.runsConceded; 
                    stats.ballsBowled += bowlPerf.ballsBowled;
                    stats.bowlingAverage = stats.wickets > 0 ? stats.runsConceded / stats.wickets : stats.runsConceded; 
                    stats.economy = stats.ballsBowled > 0 ? (stats.runsConceded / stats.ballsBowled) * 6 : 0; 
                    if (bowlPerf.wickets > stats.bestBowlingWickets || (bowlPerf.wickets === stats.bestBowlingWickets && bowlPerf.runsConceded < stats.bestBowlingRuns)) { 
                        stats.bestBowlingWickets = bowlPerf.wickets; stats.bestBowlingRuns = bowlPerf.runsConceded; stats.bestBowling = `${bowlPerf.wickets}/${bowlPerf.runsConceded}`; 
                    } 
                    if (bowlPerf.wickets >= 5) stats.fiveWicketHauls++; else if (bowlPerf.wickets >= 3) stats.threeWicketHauls++;

                    // Phase Stats
                    if (!stats.phaseStats) {
                        stats.phaseStats = {
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
                    }
                    if (!stats.phaseStats.bowling) {
                        stats.phaseStats.bowling = {
                            pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                            mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                            do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
                        };
                    }

                    const pw = stats.phaseStats.bowling;
                    pw.pp.wickets += bowlPerf.ppWickets || 0;
                    pw.pp.runsConceded += bowlPerf.ppRunsConceded || 0;
                    pw.pp.ballsBowled += bowlPerf.ppBallsBowled || 0;

                    pw.mo.wickets += bowlPerf.moWickets || 0;
                    pw.mo.runsConceded += bowlPerf.moRunsConceded || 0;
                    pw.mo.ballsBowled += bowlPerf.moBallsBowled || 0;

                    pw.do.wickets += bowlPerf.doWickets || 0;
                    pw.do.runsConceded += bowlPerf.doRunsConceded || 0;
                    pw.do.ballsBowled += bowlPerf.doBallsBowled || 0;
                }

                // Player Vs Team Bowling Records: vsTeamId is inning.teamId
                if (!newGameData.records?.playerVsTeam) newGameData.records = { ...newGameData.records, playerVsTeam: [] };
                let pvt = newGameData.records.playerVsTeam.find(r => r.playerId === bowlPerf.playerId && r.vsTeamId === inning.teamId);
                if (!pvt) {
                    pvt = {
                        playerId: bowlPerf.playerId,
                        playerName: bowlPerf.playerName,
                        playerRole: player.role,
                        vsTeamId: inning.teamId,
                        vsTeamName: inning.teamName,
                        runs: 0,
                        balls: 0,
                        dismissals: 0,
                        wickets: 0,
                        runsConceded: 0,
                        ballsBowled: 0
                    };
                    newGameData.records.playerVsTeam.push(pvt);
                }
                pvt.wickets += bowlPerf.wickets;
                pvt.runsConceded += bowlPerf.runsConceded;
                pvt.ballsBowled += bowlPerf.ballsBowled;
            }
        }

        // POTM Counter Updates (Both format-based career and season stats)
        const motmPlayer = newGameData.allPlayers.find(p => p.id === result.manOfTheMatch.playerId); 
        if (motmPlayer) { 
            if (!motmPlayer.stats[format]) motmPlayer.stats[format] = generateSingleFormatInitialStats(); 
            motmPlayer.stats[format].manOfTheMatchAwards++; 
            const season = newGameData.currentSeason;
            if (!motmPlayer.seasonStats) motmPlayer.seasonStats = {};
            if (!motmPlayer.seasonStats[season]) motmPlayer.seasonStats[season] = {} as Record<Format, PlayerStats>;
            if (!motmPlayer.seasonStats[season][format]) motmPlayer.seasonStats[season][format] = generateSingleFormatInitialStats();
            motmPlayer.seasonStats[season][format].manOfTheMatchAwards++;
        }

        newGameData.standings[format].forEach(s => {
            if (s.teamId === result.firstInning.teamId || s.teamId === result.secondInning.teamId) {
                s.played++; if (result.winnerId === s.teamId) s.won++, s.points += format.includes('First-Class') ? 4 : 2;
                else if (!result.winnerId) s.points += 1; else s.lost++;
            }
        });
        newGameData.standings[format].sort((a, b) => b.points - a.points); newGameData.matchResults[format].push(result); 
        return newGameData;
    }, []);

    return { runSimulationForCurrentFormat, updateStatsFromMatch };
}
