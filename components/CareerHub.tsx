
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, BarChart3, Settings as SettingsIcon, Newspaper, Users, Database, LayoutGrid, ArrowRightLeft, Scale, Wallet, Gavel } from 'lucide-react';
import { GameData, CareerScreen, MatchResult, Player, Format, PromotionRecord, Team, LiveMatchState, NewsArticle, PlayerRole } from '../types';
import { TEAMS, INITIAL_SPONSORSHIPS, INITIAL_NEWS } from '../data';
import { Icons } from './Icons';
import { getPlayerById, generateLeagueSchedule, negotiateSponsorships, generateMatchNews, generatePreMatchNews, getPlayerBasePrice, getPlayerMarketPrice } from '../utils';
import { calculateSeasonAwards } from '../utils/awardUtils';
import { useSimulation } from '../hooks/useSimulation';

// Components
import Dashboard from './Dashboard';
import Schedule from './Schedule';
import News from './News';
import Lineups from './Lineups';
import Editor from './Editor';
import Standings from './Standings';
import Stats from './Stats';
import Settings from './Settings';
import PlayerProfile from './PlayerProfile';
import MatchResultScreen from './MatchResultScreen';
import ForwardResultsScreen from './ForwardResultsScreen';
import AwardsAndRecordsScreen from './AwardsRecordsScreen';
import EndOfFormatScreen from './EndOfFormatScreen';
import Transfers from './Transfers';
import ComparisonScreen from './ComparisonScreen';
import LiveMatchScreen from './LiveMatchScreen';
import SponsorRoom from './SponsorRoom';
import AuctionRoom from './AuctionRoom';
import PlayerDatabase from './PlayerDatabase';

import { useFirebase } from './FirebaseProvider';
import { signIn, signOutUser } from '../services/firebase';

interface CareerHubProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    onResetGame: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    saveGame: () => void;
    loadGame: () => void;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
}

const BottomNavBar = ({ activeScreen, setScreen }: { activeScreen: CareerScreen, setScreen: (screen: CareerScreen) => void }) => {
    const navItems = [
        { name: 'HOME', screen: 'DASHBOARD' as CareerScreen, icon: Home },
        { name: 'STANDINGS', screen: 'LEAGUES' as CareerScreen, icon: Trophy },
        { name: 'STATS', screen: 'STATS' as CareerScreen, icon: BarChart3 },
        { name: 'SETTINGS', screen: 'SETTINGS' as CareerScreen, icon: SettingsIcon },
    ];
    return (
        <nav className="bg-white/80 dark:bg-[#0A0F0F]/90 border-t border-slate-200 dark:border-slate-800/50 flex justify-around items-center h-[80px] pb-4 backdrop-blur-xl sticky bottom-0 z-50">
            {navItems.map(item => {
                const isActive = activeScreen === item.screen;
                return (
                    <button
                        key={item.name}
                        onClick={() => setScreen(item.screen)}
                        className={`relative flex flex-col items-center justify-center space-y-1 w-1/4 pt-2 transition-all duration-300 ${isActive ? 'text-teal-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="nav-active"
                                className="absolute -top-2 w-12 h-1 bg-teal-500 rounded-full"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[9px] font-black tracking-[0.15em] uppercase">{item.name}</span>
                    </button>
                );
            })}
        </nav>
    );
};

const CareerHub: React.FC<CareerHubProps> = ({ gameData, setGameData, onResetGame, theme, setTheme, saveGame, loadGame, showFeedback }) => {
    const [screen, setScreen] = useState<CareerScreen>('DASHBOARD');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [playerProfileFormat, setPlayerProfileFormat] = useState<Format>(gameData.currentFormat);
    const [selectedMatchResult, setSelectedMatchResult] = useState<MatchResult | null>(null);
    const [forwardSimResults, setForwardSimResults] = useState<MatchResult[]>([]);

    const { runSimulationForCurrentFormat, updateStatsFromMatch } = useSimulation(gameData, setGameData);

    const optimizeAllSquads = () => {
        if (!gameData) return;
        setGameData(prev => {
            if (!prev) return null;
            const format = prev.currentFormat;
            const finalPlayingXIs = { ...prev.playingXIs };
            
            const updatedTeams = prev.teams.map(t => {
                const squad = [...t.squad].filter(p => !p.injury);
                // If squad is too small, use full squad anyway (fallback)
                const activeSquad = squad.length >= 11 ? squad : t.squad;

                const xi: Player[] = [];
                const selectedIds = new Set<string>();
                const maxForeignAllowed = prev.currentFormat === Format.T20 ? 3 : 0;
                let foreignInXI = 0;

                const addPlayer = (p: Player) => {
                    if (selectedIds.has(p.id)) return false;
                    if (p.isForeign && foreignInXI >= maxForeignAllowed) return false;
                    
                    xi.push(p);
                    selectedIds.add(p.id);
                    if (p.isForeign) foreignInXI++;
                    return true;
                };

                // 1. Mandatory Minimums
                const wk = activeSquad.filter(p => p.role === PlayerRole.WICKET_KEEPER).sort((a,b) => b.battingSkill - a.battingSkill)[0];
                if (wk) addPlayer(wk);

                const batters = activeSquad.filter(p => p.role === PlayerRole.BATSMAN).sort((a,b) => b.battingSkill - a.battingSkill);
                batters.slice(0, 4).forEach(p => addPlayer(p));

                const ar = activeSquad.filter(p => p.role === PlayerRole.ALL_ROUNDER).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))[0];
                if (ar) addPlayer(ar);

                const bowlers = activeSquad.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER).sort((a,b) => b.secondarySkill - a.secondarySkill);
                bowlers.slice(0, 3).forEach(p => addPlayer(p));

                // 2. Fill to 11 ensuring Max 5 Bowlers
                const others = activeSquad.filter(p => !selectedIds.has(p.id))
                    .sort((a,b) => (Math.max(b.battingSkill, b.secondarySkill)) - (Math.max(a.battingSkill, a.secondarySkill)));

                for (const p of others) {
                    if (xi.length >= 11) break;
                    const currentBowlers = xi.filter(px => px.role === PlayerRole.FAST_BOWLER || px.role === PlayerRole.SPIN_BOWLER).length;
                    const isProperBowler = p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER;
                    if (isProperBowler && currentBowlers >= 5) continue;
                    addPlayer(p);
                }

                // Emergency fill
                if (xi.length < 11) {
                    const emergency = activeSquad.filter(p => !selectedIds.has(p.id)).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
                    emergency.forEach(p => { if (xi.length < 11) addPlayer(p); });
                }

                // 3. Official Ordering (1-11)
                // Group A: Best performers for top order (highest battingSkill)
                // Group B: Proper Bowlers for 8-11
                const finalXIPlayers = xi.slice(0, 11);
                const properBowlers = finalXIPlayers.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER).sort((a,b) => a.secondarySkill - b.secondarySkill); // weakest bowlers first in this subset? No, usually 8-11 are best bowlers.
                
                // Let's just pick top 7 batters and 4 bowlers
                const sortedByBat = [...finalXIPlayers].sort((a,b) => b.battingSkill - a.battingSkill);
                const top7 = sortedByBat.slice(0, 7);
                const tail = finalXIPlayers.filter(p => !top7.find(t7 => t7.id === p.id)).sort((a,b) => b.secondarySkill - a.secondarySkill);

                const newXIIds = [...top7, ...tail].map(p => p.id);
                finalPlayingXIs[t.id] = { ...finalPlayingXIs[t.id], [format]: newXIIds };

                let cid = t.captainId;
                if (!cid || !newXIIds.includes(cid)) {
                    cid = finalXIPlayers.sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))[0]?.id || null;
                }

                return { ...t, captainId: cid };
            });

            return { ...prev, teams: updatedTeams, playingXIs: finalPlayingXIs };
        });
        showFeedback("Squads Optimized: Balanced Playing XI enforced (4 BT, 1 WK, 1 AR, 3-5 BL).", "success");
    };

    useEffect(() => {
        if (gameData && (!gameData.sponsorships || !gameData.popularity || !gameData.news)) {
             setGameData(prev => {
                 if (!prev) return null;
                 return {
                     ...prev,
                     popularity: prev.popularity ?? 50,
                     sponsorships: prev.sponsorships ?? INITIAL_SPONSORSHIPS,
                     news: prev.news ?? INITIAL_NEWS
                 };
             });
        }
    }, [gameData, setGameData]);

    const userTeam = useMemo(() => {
        return gameData.teams.find(t => t.id === gameData.userTeamId) || gameData.teams[0];
    }, [gameData]);

    useEffect(() => {
        const schedule = gameData.schedule[gameData.currentFormat];
        const currentMatchIndex = gameData.currentMatchIndex[gameData.currentFormat];

        if (schedule && currentMatchIndex >= schedule.length) {
            const awardExists = gameData.awardsHistory.some(a => a.season === gameData.currentSeason && a.format === gameData.currentFormat);
            
            if (!awardExists) {
                const newAward = calculateSeasonAwards(gameData, gameData.currentFormat);
                setGameData(prev => prev ? { ...prev, awardsHistory: [...prev.awardsHistory, newAward] } : null);
                setScreen('END_OF_FORMAT');
            } else if (screen === 'DASHBOARD') {
                setScreen('END_OF_FORMAT');
            }
        }
    }, [gameData.currentMatchIndex, gameData.currentFormat, gameData.currentSeason, gameData.awardsHistory, gameData.teams, gameData.allPlayers, gameData.matchResults, gameData.schedule, screen, setGameData]);

    const handleUpdatePlayer = (updatedPlayer: Player) => {
        setGameData(prevData => {
            if (!prevData) return null;
            const newAllPlayers = prevData.allPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
            const newTeams = prevData.teams.map(team => ({
                ...team,
                squad: team.squad.map(squadPlayer => newAllPlayers.find(p => p.id === squadPlayer.id) || squadPlayer)
            }));
            return { ...prevData, allPlayers: newAllPlayers, teams: newTeams };
        });
    };

    const handleCreatePlayer = (newPlayer: Player) => {
        setGameData(prevData => {
            if (!prevData) return null;
            return { ...prevData, allPlayers: [...prevData.allPlayers, newPlayer] };
        });
    };

    const handleUpdateGround = (code: string, newPitch: string) => setGameData(prev => prev ? { ...prev, grounds: prev.grounds.map(g => g.code === code ? { ...g, pitch: newPitch } : g) } : null);
    
    const handleUpdateScoreLimits = (groundCode: string, format: Format, field: any, value: any, inning: number) => {
        setGameData(prev => {
            if (!prev) return null;
            const numValue = parseInt(value, 10);
            const newLimits: any = JSON.parse(JSON.stringify(prev.scoreLimits || {}));
            if (!newLimits[groundCode]) newLimits[groundCode] = {};
            if (!newLimits[groundCode][format]) newLimits[groundCode][format] = {};
            if (!newLimits[groundCode][format][inning]) newLimits[groundCode][format][inning] = {};
            
            if (value === '' || isNaN(numValue) || numValue <= 0) {
                delete newLimits[groundCode][format][inning][field];
            } else {
                newLimits[groundCode][format][inning][field] = numValue;
            }
            
            return { ...prev, scoreLimits: newLimits };
        });
    };

    const handleUpdateCaptain = (teamId: string, format: Format, playerId: string) => {
        setGameData(prevData => {
            if (!prevData) return null;
            return {
                ...prevData,
                teams: prevData.teams.map(t => {
                    if (t.id === teamId) {
                        return { ...t, captains: { ...t.captains, [format]: playerId } };
                    }
                    return t;
                })
            };
        });
        showFeedback("Captain updated!");
    };

    const handleUpdatePlayingXI = (teamId: string, format: Format, newXI: string[]) => {
        setGameData(prevData => {
            if (!prevData) return null;
            const teamXIs = prevData.playingXIs[teamId] || {};
            return {
                ...prevData,
                playingXIs: {
                    ...prevData.playingXIs,
                    [teamId]: {
                        ...teamXIs,
                        [format]: newXI
                    }
                }
            };
        });
    };

    const simulateBackgroundMatches = (currentData: GameData): GameData => {
        let updatedData = JSON.parse(JSON.stringify(currentData)) as GameData;
        Object.values(Format).forEach(f => {
            if (f === updatedData.currentFormat) return; 

            const schedule = updatedData.schedule[f];
            let mIdx = updatedData.currentMatchIndex[f];
            
            for (let i = 0; i < 8; i++) {
                if (mIdx < schedule.length) {
                    let match = JSON.parse(JSON.stringify(schedule[mIdx]));
                    
                    if (match.group !== 'Round-Robin') {
                        const standings = updatedData.standings[f];
                        const getTeamName = (pos: number) => standings[pos - 1]?.teamName;
                        const resolvePlaceholder = (placeholder: string) => {
                            if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) return getTeamName(parseInt(placeholder[0]));
                            if (placeholder.startsWith('SF')) {
                                const sfRes = updatedData.matchResults[f].find(r => r.matchNumber === placeholder.split(' ')[0]);
                                return updatedData.teams.find(t => t.id === sfRes?.winnerId)?.name || 'TBD';
                            }
                            return placeholder;
                        };
                        match.teamA = resolvePlaceholder(match.teamA) || 'TBD';
                        match.teamB = resolvePlaceholder(match.teamB) || 'TBD';
                        if (match.teamA === 'TBD' || match.teamB === 'TBD') break;
                    }

                    const result = runSimulationForCurrentFormat(match, updatedData);
                    updatedData = updateStatsFromMatch(result, f, updatedData);
                    updatedData.currentMatchIndex[f]++;
                    mIdx++;
                }
            }
        });
        return updatedData;
    };

    const handleForwardDay = () => {
        if (!userTeam) return;
        let currentData = { ...gameData };
        let matchIndex = currentData.currentMatchIndex[currentData.currentFormat];
        let schedule = currentData.schedule[currentData.currentFormat];
        const results: MatchResult[] = [];
        const newNewsItems: NewsArticle[] = [];

        currentData = simulateBackgroundMatches(currentData);

        for(let i=0; i<5; i++) {
            if (matchIndex + i < schedule.length) {
                const m = schedule[matchIndex+i];
                if (m.teamA === userTeam.name || m.teamB === userTeam.name) {
                    const preNews = generatePreMatchNews(m, currentData);
                    newNewsItems.push(preNews);
                    break;
                }
            }
        }

        let simulatedCount = 0;
        const maxSimulations = 8;

        while (matchIndex < schedule.length && simulatedCount < maxSimulations) {
            let matchToSim = JSON.parse(JSON.stringify(schedule[matchIndex]));
            
            if (matchToSim.group !== 'Round-Robin') {
                const standings = currentData.standings[currentData.currentFormat];
                const getTeamName = (pos: number) => standings[pos - 1]?.teamName;
                const resolvePlaceholder = (placeholder: string) => {
                    if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                        const pos = parseInt(placeholder[0]);
                        return getTeamName(pos);
                    }
                    if (placeholder.startsWith('SF')) {
                        const sfMatchNumber = placeholder.split(' ')[0];
                        const sfResult = currentData.matchResults[currentData.currentFormat].find(r => r.matchNumber === sfMatchNumber);
                        const winner = currentData.teams.find(t => t.id === sfResult?.winnerId);
                        return winner?.name || null;
                    }
                    return placeholder;
                };
                matchToSim.teamA = resolvePlaceholder(matchToSim.teamA) || 'TBD';
                matchToSim.teamB = resolvePlaceholder(matchToSim.teamB) || 'TBD';
                
                if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') break; 
            }

            const isUserTeamMatch = matchToSim.teamA === userTeam.name || matchToSim.teamB === userTeam.name;
            if (isUserTeamMatch) break;

            const result = runSimulationForCurrentFormat(matchToSim, currentData);
            currentData = updateStatsFromMatch(result, currentData.currentFormat, currentData);
            currentData.currentMatchIndex[currentData.currentFormat]++; 
            results.push(result);
            simulatedCount++;
            
            if (matchToSim.group !== 'Round-Robin' || Math.random() < 0.3) {
                const sponsorship = currentData.sponsorships?.[currentData.currentFormat] || INITIAL_SPONSORSHIPS[currentData.currentFormat];
                newNewsItems.push(generateMatchNews(result, currentData.currentFormat, sponsorship));
            }
            
            matchIndex++;
        }

        if (newNewsItems.length > 0) currentData.news = [...newNewsItems, ...currentData.news].slice(0, 50);

        if (results.length > 0) {
            setForwardSimResults(results);
            setGameData(currentData); 
            setScreen('FORWARD_RESULTS');
        } else {
             if (matchIndex < schedule.length) {
                 if (newNewsItems.length > 0) {
                     setGameData(prev => prev ? { ...prev, news: [...newNewsItems, ...prev.news] } : null);
                 }
                 showFeedback("Match 1 or upcoming user match is next.", "success");
             } else {
                 showFeedback("Tournament matches completed.", "success");
             }
        }
    };

    const handlePlayMatch = () => {
        if (!userTeam) return;
        
        const schedule = gameData.schedule[gameData.currentFormat];
        const currentMatchIndex = gameData.currentMatchIndex[gameData.currentFormat];
        if (currentMatchIndex >= schedule.length) return;

        let matchToSim = JSON.parse(JSON.stringify(schedule[currentMatchIndex]));

        if (matchToSim.group !== 'Round-Robin') {
             const standings = gameData.standings[gameData.currentFormat];
             const getTeamName = (pos: number) => standings[pos - 1]?.teamName;
             const resolvePlaceholder = (placeholder: string) => {
                if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) return getTeamName(parseInt(placeholder[0]));
                if (placeholder.startsWith('SF')) {
                    const sfMatchNumber = placeholder.split(' ')[0];
                    const sfResult = gameData.matchResults[gameData.currentFormat].find(r => r.matchNumber === sfMatchNumber);
                    return gameData.teams.find(t => t.id === sfResult?.winnerId)?.name || null;
                }
                return placeholder;
            };
            matchToSim.teamA = resolvePlaceholder(matchToSim.teamA) || 'TBD';
            matchToSim.teamB = resolvePlaceholder(matchToSim.teamB) || 'TBD';
        }

        if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') {
            showFeedback("Waiting for league stage to conclude.", "error");
            return;
        }

        const isUserTeamMatch = matchToSim.teamA === userTeam.name || matchToSim.teamB === userTeam.name;
        
        if (isUserTeamMatch) {
            // Validate lineup for injuries
            const playingXIIds = gameData.playingXIs[userTeam.id]?.[gameData.currentFormat] || [];
            const injuredPlayers = playingXIIds
                .map(id => userTeam.squad.find(p => p.id === id))
                .filter(p => p && p.injury);

            if (injuredPlayers.length > 0) {
                showFeedback(`Cannot start match! ${injuredPlayers[0]?.name} is injured. Replace them in Lineups.`, "error");
                setScreen('LINEUPS');
                return;
            }

            setScreen('LIVE_MATCH');
        } else {
             const result = runSimulationForCurrentFormat(matchToSim, gameData);
             const updatedData = updateStatsFromMatch(result, gameData.currentFormat, gameData);
             updatedData.currentMatchIndex[gameData.currentFormat]++;
             const sponsorship = updatedData.sponsorships?.[updatedData.currentFormat] || INITIAL_SPONSORSHIPS[updatedData.currentFormat];
             const newsItem = generateMatchNews(result, updatedData.currentFormat, sponsorship);
             updatedData.news = [newsItem, ...updatedData.news].slice(0, 50);
             setGameData(updatedData);
             setSelectedMatchResult(result);
             setScreen('MATCH_RESULT');
        }
    };

    const handleLiveMatchComplete = (result: MatchResult) => {
        const updatedData = updateStatsFromMatch(result, gameData.currentFormat, gameData);
        updatedData.currentMatchIndex[gameData.currentFormat]++;
        updatedData.activeMatch = null; 
        const sponsorship = updatedData.sponsorships?.[updatedData.currentFormat] || INITIAL_SPONSORSHIPS[updatedData.currentFormat];
        const newsItem = generateMatchNews(result, updatedData.currentFormat, sponsorship);
        updatedData.news = [newsItem, ...updatedData.news].slice(0, 50);
        setGameData(updatedData);
        setSelectedMatchResult(result);
        setScreen('MATCH_RESULT');
    };

    const handleLiveMatchExit = (stateToSave?: LiveMatchState) => {
        if (stateToSave) {
            setGameData(prev => prev ? { ...prev, activeMatch: stateToSave } : null);
            showFeedback("Match progress saved.", "success");
        } else setGameData(prev => prev ? { ...prev, activeMatch: null } : null);
        setScreen('DASHBOARD');
    }

    const handleFormatChange = useCallback((newFormat: Format) => {
        setGameData(prev => prev ? ({ ...prev, currentFormat: newFormat }) : null);
        setScreen('DASHBOARD');
    }, [setGameData]);

    const handleEndOfSeason = useCallback((retainedPlayers: Player[]) => {
        setGameData((prevData: GameData | null) => {
            if (!prevData) return null;
            
            // Retention price logic with performance adjustments
            const calculateRetentionPrice = (p: Player) => {
                const basePrice = p.basePrice || getPlayerBasePrice(p);
                const stats = p.stats[Format.T20];
                let multiplier = 4; // Default rule: Base Price x4
                
                if (stats && stats.matches >= 3) {
                    const batAvg = stats.average;
                    const bowlEcon = stats.economy;
                    
                    // Performance Increase
                    if (batAvg >= 35 || (stats.wickets >= 10 && bowlEcon <= 8.5)) {
                        multiplier = 5; // Performance bonus
                    }
                    // Performance Decrease
                    else if (batAvg < 15 && stats.wickets < 3) {
                        multiplier = 3; // Underperformer penalty
                    }
                }
                
                return Number((basePrice * multiplier).toFixed(2));
            };

            const isStruggling = (p: Player) => {
                const stats = p.stats[Format.T20];
                if (!stats || stats.matches < 3) return false;
                if (p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER) {
                    return stats.average < 18;
                }
                return stats.economy > 10.5;
            };

            const userCost = retainedPlayers.reduce((sum, p) => sum + calculateRetentionPrice(p), 0);

            // Get top 50 performers for priority
            const leagueBatters = [...prevData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.runs || 0) - (a.stats[Format.T20]?.runs || 0));
            const top50Batters = new Set(leagueBatters.slice(0, 50).map(p => p.id));
            const leagueBowlers = [...prevData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.wickets || 0) - (a.stats[Format.T20]?.wickets || 0));
            const top50Bowlers = new Set(leagueBowlers.slice(0, 50).map(p => p.id));

            const newTeams = prevData.teams.map(t => {
                let currentSquad: Player[] = [];
                let purseVal = 0;
                
                if (t.id === prevData.userTeamId) {
                    const validRetained = retainedPlayers.filter(p => !p.isForeign);
                    currentSquad = validRetained;
                    purseVal = Number((100.0 - userCost).toFixed(2));
                } else {
                    // Retention priority: Top 50 performers > Best of rest > No Foreigners > No Strugglers
                    const candidates = t.squad.filter(p => !p.isForeign && !isStruggling(p));
                    const performers = candidates.filter(p => top50Batters.has(p.id) || top50Bowlers.has(p.id));
                    
                    let aiRetained = [...performers];
                    if (aiRetained.length < 5) {
                        const others = candidates.filter(p => !performers.includes(p)).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
                        aiRetained = [...aiRetained, ...others.slice(0, 5 - aiRetained.length)];
                    }
                    
                    const aiCost = aiRetained.reduce((sum, p) => sum + calculateRetentionPrice(p), 0);
                    currentSquad = aiRetained;
                    purseVal = Number((100.0 - aiCost).toFixed(2));
                }

                const updatedSquad = currentSquad.map(p => {
                    const nextPrice = calculateRetentionPrice(p);
                    const newStats = { ...p.stats };
                    // Reset stats for new season but keep history? Usually we reset for the 'league' view.
                    // The core stats are format-based, maybe we keep them and add a 'career' log later.
                    // For now, let's just update the price.
                    
                    if (p.injury && p.injury.durationType === 'seasons') {
                        const nextDuration = p.injury.durationValue - 1;
                        if (nextDuration <= 0) {
                            return { ...p, injury: null, basePrice: nextPrice };
                        } else {
                            return { ...p, injury: { ...p.injury, durationValue: nextDuration }, basePrice: nextPrice };
                        }
                    }
                    return { ...p, basePrice: nextPrice };
                });

                return {
                    ...t,
                    squad: updatedSquad,
                    purse: purseVal,
                    firstAidKits: (t.firstAidKits || 0) + 1
                };
            });

            // Update all players prices and injuries
            const updatedAllPlayers = prevData.allPlayers.map(p => {
                const nextPrice = calculateRetentionPrice(p);
                let pUpdated = { ...p, basePrice: nextPrice };
                
                if (p.injury && p.injury.durationType === 'seasons') {
                    const nextDuration = p.injury.durationValue - 1;
                    if (nextDuration <= 0) {
                        pUpdated.injury = null;
                    } else {
                        pUpdated.injury = { ...p.injury, durationValue: nextDuration };
                    }
                }
                return pUpdated;
            });

            const initialStandings = (teams: Team[]) => teams.map(team => ({ teamId: team.id, teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 }));

            const seasonNews: NewsArticle = { 
                id: `s${prevData.currentSeason}-end`, 
                headline: `Season ${prevData.currentSeason+1} Draft Room Open!`, 
                date: new Date().toLocaleDateString(), 
                excerpt: "Teams reveal retained players & Medical replenish has arrived.", 
                content: "Windows for retention have closed. Every team has been supplied 1 emergency First Aid kit for the upcoming campaign.", 
                type: 'league' as const
            };

            return {
                ...prevData,
                currentSeason: prevData.currentSeason + 1,
                currentFormat: Format.T20,
                currentMatchIndex: { [Format.T20]: 0, [Format.ODI]: 0, [Format.SHIELD]: 0 } as Record<Format, number>,
                matchResults: { [Format.T20]: [], [Format.ODI]: [], [Format.SHIELD]: [] } as Record<Format, MatchResult[]>,
                standings: { 
                    [Format.T20]: initialStandings(newTeams), 
                    [Format.ODI]: initialStandings(newTeams), 
                    [Format.SHIELD]: initialStandings(newTeams) 
                },
                schedule: { 
                    [Format.T20]: generateLeagueSchedule(newTeams, Format.T20, true), 
                    [Format.ODI]: generateLeagueSchedule(newTeams, Format.ODI, true), 
                    [Format.SHIELD]: generateLeagueSchedule(newTeams, Format.SHIELD, true)
                },
                teams: newTeams,
                allPlayers: updatedAllPlayers,
                news: [seasonNews, ...prevData.news].slice(0, 50)
            };
        });
        setScreen('AUCTION_ROOM');
    }, [setGameData]);

    const { user } = useFirebase();

    const renderScreen = () => {
        const commonProps = { gameData, userTeam, setGameData, setScreen, showFeedback, optimizeAllSquads };
        switch(screen) {
            case 'DASHBOARD': return <Dashboard {...commonProps} handlePlayMatch={handlePlayMatch} handleForwardDay={handleForwardDay} />;
            case 'LEAGUES': return <Standings gameData={gameData} />; 
            case 'SCHEDULE': return <Schedule gameData={gameData} userTeam={userTeam} viewMatchResult={result => { setSelectedMatchResult(result); setScreen('MATCH_RESULT'); }} />;
            case 'LINEUPS': return <Lineups {...commonProps} handleUpdatePlayingXI={handleUpdatePlayingXI} handleUpdateCaptain={handleUpdateCaptain} />;
            case 'EDITOR': return <Editor {...commonProps} handleUpdatePlayer={handleUpdatePlayer} handleCreatePlayer={handleCreatePlayer} handleUpdateGround={handleUpdateGround} handleUpdateScoreLimits={handleUpdateScoreLimits} />;
            case 'PLAYER_DATABASE': return <PlayerDatabase gameData={gameData} onAddPlayer={() => setScreen('EDITOR')} onViewPlayer={(p) => { setSelectedPlayer(p); setScreen('PLAYER_PROFILE'); }} />;
            case 'NEWS': return <News news={gameData.news} />;
            case 'STATS': return <Stats gameData={gameData} viewPlayerProfile={(p, f) => { setSelectedPlayer(p); setPlayerProfileFormat(f); setScreen('PLAYER_PROFILE'); }} />;
            case 'SETTINGS': return <Settings onResetGame={onResetGame} theme={theme} setTheme={setTheme} saveGame={saveGame} loadGame={loadGame} user={user} onSignIn={signIn} onSignOut={signOutUser} />;
            case 'PLAYER_PROFILE': return <PlayerProfile player={selectedPlayer} onBack={() => setScreen('STATS')} initialFormat={playerProfileFormat} currentSeason={gameData.currentSeason} />;
            case 'MATCH_RESULT': return <MatchResultScreen result={selectedMatchResult} onBack={() => setScreen('DASHBOARD')} userTeamId={gameData.userTeamId} />;
            case 'FORWARD_RESULTS': return <ForwardResultsScreen results={forwardSimResults} onBack={() => setScreen('DASHBOARD')} userTeamId={gameData.userTeamId} />;
            case 'AWARDS_RECORDS': return <AwardsAndRecordsScreen gameData={gameData} />;
            case 'END_OF_FORMAT': return <EndOfFormatScreen gameData={gameData} handleFormatChange={handleFormatChange} handleEndSeason={handleEndOfSeason} />;
            case 'TRANSFERS': return <Transfers {...commonProps} />;
            case 'COMPARISON': return <ComparisonScreen gameData={gameData} />;
            case 'SPONSOR_ROOM': return <SponsorRoom gameData={gameData} setGameData={setGameData} />;
            case 'AUCTION_ROOM': return <AuctionRoom gameData={gameData} onAuctionComplete={(teams) => { 
                setGameData(prev => prev ? { ...prev, teams } : null);
                setScreen('DASHBOARD');
            }} />;
            case 'LIVE_MATCH': {
                const schedule = gameData.schedule[gameData.currentFormat];
                const currentMatchIndex = gameData.currentMatchIndex[gameData.currentFormat];
                const match = schedule[currentMatchIndex];
                let resolvedMatch = match ? JSON.parse(JSON.stringify(match)) : null;
                if (resolvedMatch) {
                    const resolvePlaceholder = (placeholder: string) => {
                        if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                            const pos = parseInt(placeholder[0]);
                            return gameData.standings[gameData.currentFormat][pos-1]?.teamName || 'TBD';
                        }
                        if (placeholder.startsWith('SF')) {
                            const sfResult = gameData.matchResults[gameData.currentFormat].find(r => r.matchNumber === placeholder.split(' ')[0]);
                            return gameData.teams.find(t => t.id === sfResult?.winnerId)?.name || 'TBD';
                        }
                        return placeholder;
                    };
                    resolvedMatch.teamA = resolvePlaceholder(resolvedMatch.teamA);
                    resolvedMatch.teamB = resolvePlaceholder(resolvedMatch.teamB);
                }
                return resolvedMatch ? (
                    <LiveMatchScreen match={resolvedMatch} gameData={gameData} onMatchComplete={handleLiveMatchComplete} onExit={handleLiveMatchExit} savedState={gameData.activeMatch} /> 
                ) : <div className="p-4 text-center"><p>Tournament finished.</p><button onClick={() => setScreen('DASHBOARD')} className="mt-4 bg-teal-500 text-white px-4 py-2 rounded">Back</button></div>;
            }
            default: return <div>Coming Soon</div>
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#050808] text-slate-900 dark:text-slate-100">
            <main className="flex-grow overflow-y-auto relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={screen}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="h-full"
                    >
                        {renderScreen()}
                    </motion.div>
                </AnimatePresence>
            </main>
            <BottomNavBar activeScreen={screen} setScreen={setScreen} />
        </div>
    );
};

export default CareerHub;
