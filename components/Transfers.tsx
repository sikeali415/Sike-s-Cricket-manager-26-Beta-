import React, { useState, useMemo, useEffect } from 'react';
import { GameData, Team, Player } from '../types';
import { Icons } from './Icons';
import { getPlayerBasePrice } from '../utils';

interface TransfersProps {
    gameData: GameData;
    userTeam: Team | null;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
}

const LOCAL_MAX_SQUAD_SIZE = 18;
const LOCAL_MIN_SQUAD_SIZE = 12;
const LOCAL_MAX_FOREIGN_PLAYERS = 5;

const Transfers: React.FC<TransfersProps> = ({ gameData, userTeam, setGameData, showFeedback }) => {
    // Hooks MUST be at top level
    const [selectedTeamId, setSelectedTeamId] = useState(userTeam?.id || '');
    const [tradeSource, setTradeSource] = useState('free-agents');
    const [playerToTradeOut, setPlayerToTradeOut] = useState<Player | null>(null);
    const [playerToTradeIn, setPlayerToTradeIn] = useState<Player | null>(null);

    const selectedTeam = useMemo(() => gameData.teams.find(t => t.id === selectedTeamId), [gameData.teams, selectedTeamId]);

    // Sync selectedTeamId if userTeam changes
    useEffect(() => {
        if (userTeam && !selectedTeamId) {
            setSelectedTeamId(userTeam.id);
        }
    }, [userTeam, selectedTeamId]);

    useEffect(() => {
        setPlayerToTradeOut(null);
        setPlayerToTradeIn(null);
    }, [selectedTeamId, tradeSource]);

    const freeAgents = useMemo(() => {
        const allSquadPlayerIds = new Set(gameData.teams.flatMap(t => t.squad.map(p => p.id)));
        return gameData.allPlayers.filter(p => !allSquadPlayerIds.has(p.id))
            .sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    }, [gameData]);

    if (!userTeam || !selectedTeam) return <div className="p-4 text-center">Loading Management...</div>;

    const handleTrade = () => {
        if (!playerToTradeOut || !playerToTradeIn) return;
        
        const team1 = selectedTeam;
        const team2 = gameData.teams.find(t => t.id === tradeSource);
        
        if (!team2) {
            showFeedback("Invalid trade partner.", "error");
            return;
        }

        const team1ForeignCount = team1.squad.filter(p => p.isForeign).length;
        const team2ForeignCount = team2.squad.filter(p => p.isForeign).length;

        const newTeam1ForeignCount = team1ForeignCount - (playerToTradeOut.isForeign ? 1 : 0) + (playerToTradeIn.isForeign ? 1 : 0);
        const newTeam2ForeignCount = team2ForeignCount - (playerToTradeIn.isForeign ? 1 : 0) + (playerToTradeOut.isForeign ? 1 : 0);

        if (newTeam1ForeignCount > LOCAL_MAX_FOREIGN_PLAYERS) {
            showFeedback(`${team1.name} would exceed the ${LOCAL_MAX_FOREIGN_PLAYERS} foreign player limit.`, "error");
            return;
        }
        if (newTeam2ForeignCount > LOCAL_MAX_FOREIGN_PLAYERS) {
            showFeedback(`${team2.name} would exceed the ${LOCAL_MAX_FOREIGN_PLAYERS} foreign player limit.`, "error");
            return;
        }

        setGameData(prev => {
            if (!prev) return null;
            const newTeams = prev.teams.map(t => {
                if (t.id === team1.id) {
                    const newSquad = t.squad.filter(p => p.id !== playerToTradeOut.id);
                    newSquad.push(playerToTradeIn);
                    return { ...t, squad: newSquad };
                }
                if (t.id === team2.id) {
                    const newSquad = t.squad.filter(p => p.id !== playerToTradeIn.id);
                    newSquad.push(playerToTradeOut);
                    return { ...t, squad: newSquad };
                }
                return t;
            });
            return { ...prev, teams: newTeams };
        });
        showFeedback("Trade successful!", "success");
        setPlayerToTradeOut(null);
        setPlayerToTradeIn(null);
    };

    const releasePlayer = (playerId: string) => {
        if (selectedTeam.squad.length <= LOCAL_MIN_SQUAD_SIZE) {
            showFeedback(`Squad size cannot be below ${LOCAL_MIN_SQUAD_SIZE}`, "error");
            return;
        }
        setGameData(prev => {
            if (!prev) return null;
            const newTeams = prev.teams.map(t => {
                if (t.id === selectedTeamId) {
                    return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
                }
                return t;
            });
            return { ...prev, teams: newTeams };
        });
        showFeedback("Player released to free agency.", "success");
    };

    const signPlayer = (player: Player) => {
        if (selectedTeam.squad.length >= LOCAL_MAX_SQUAD_SIZE) {
            showFeedback(`Squad size cannot exceed ${LOCAL_MAX_SQUAD_SIZE}`, "error");
            return;
        }
        
        const basePrice = (player.basePrice || getPlayerBasePrice(player));
        const marketValue = Number((basePrice * 0.65).toFixed(2)); // User requested 60-70 range for 1 Cr base
        
        if (selectedTeam.purse < marketValue) {
            showFeedback(`Insufficient funds! Need ${marketValue} Cr. to sign ${player.name}`, "error");
            return;
        }

        const foreignPlayersCount = selectedTeam.squad.filter(p => p.isForeign).length;
        if (player.isForeign && foreignPlayersCount >= LOCAL_MAX_FOREIGN_PLAYERS) {
            showFeedback(`You can only have ${LOCAL_MAX_FOREIGN_PLAYERS} foreign players.`, "error");
            return;
        }
        setGameData(prev => {
            if (!prev) return null;
            const newTeams = prev.teams.map(t => {
                if (t.id === selectedTeamId) {
                    return { 
                        ...t, 
                        squad: [...t.squad, player],
                        purse: Number((t.purse - marketValue).toFixed(2))
                    };
                }
                return t;
            });
            return { ...prev, teams: newTeams };
        });
        showFeedback(`Signed ${player.name} for ${marketValue} Crore!`, "success");
    };

    const rightPanelList = tradeSource === 'free-agents' ? freeAgents : (gameData.teams.find(t => t.id === tradeSource)?.squad || []);

    const hasMatchesStarted = useMemo(() => {
        return gameData.matchResults[gameData.currentFormat]?.some(r => r.winnerId === userTeam.id || r.loserId === userTeam.id) || false;
    }, [gameData, userTeam.id]);

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col pt-12">
            <h2 className="text-xl font-bold text-center mb-2 uppercase tracking-tighter italic">Transfer Market</h2>
            {hasMatchesStarted && (
                <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">
                        Transfer Window Closed
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Team-to-team swaps are disabled after match 1. You can still sign Free Agents.
                    </p>
                </div>
            )}
            <div className="mb-2 flex items-center gap-2">
                 <select 
                    value={selectedTeamId} 
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="flex-1 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-bold"
                >
                    {gameData.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                 </select>
                 <div className="text-right">
                    <span className="text-xs font-bold text-teal-500 block leading-none">{selectedTeam.purse.toFixed(2)} Cr</span>
                    <span className="text-[8px] text-gray-500 uppercase font-black">Purse</span>
                 </div>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-grow overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                    <h3 className="font-semibold text-center mb-1 text-xs opacity-60 uppercase">{selectedTeam.name} ({selectedTeam.squad.length}/{LOCAL_MAX_SQUAD_SIZE})</h3>
                    <ul className="space-y-1 overflow-y-auto pr-1">
                        {selectedTeam.squad.map(p => (
                            <li key={p.id} 
                                onClick={() => tradeSource !== 'free-agents' && !hasMatchesStarted && setPlayerToTradeOut(p)}
                                className={`flex flex-col p-2 rounded-md text-sm cursor-pointer ${playerToTradeOut?.id === p.id ? 'bg-teal-200 dark:bg-teal-800' : 'bg-gray-100 dark:bg-gray-800/50'} ${tradeSource !== 'free-agents' && hasMatchesStarted ? 'opacity-50 grayscale' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate max-w-[80px] font-bold">{p.name} {p.isForeign ? '✈️' : ''}</span>
                                    <span className="font-semibold text-xs">{p.battingSkill}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1 pt-1 border-t border-black/5 dark:border-white/5">
                                    <span className="text-[9px] text-gray-400">Value: {(p.basePrice || getPlayerBasePrice(p)).toFixed(2)} Cr</span>
                                    {tradeSource === 'free-agents' && (
                                        <button onClick={(e) => { e.stopPropagation(); releasePlayer(p.id); }} className="text-rose-500">
                                            <Icons.RemoveCircle />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <select 
                        value={tradeSource} 
                        onChange={e => setTradeSource(e.target.value)}
                        className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 mb-1 text-xs font-bold"
                    >
                        <option value="free-agents">Free Agents</option>
                        {gameData.teams.filter(t => t.id !== selectedTeamId).map(team => (
                            <option key={team.id} value={team.id} disabled={hasMatchesStarted}>{team.name}</option>
                        ))}
                    </select>
                     <ul className="space-y-1 overflow-y-auto pr-1">
                        {rightPanelList.map(p => {
                            const bp = (p.basePrice || getPlayerBasePrice(p));
                            const val = bp * 0.65;
                            return (
                                <li key={p.id} 
                                    onClick={() => tradeSource !== 'free-agents' && !hasMatchesStarted && setPlayerToTradeIn(p)}
                                    className={`flex flex-col p-2 rounded-md text-sm cursor-pointer ${playerToTradeIn?.id === p.id ? 'bg-teal-200 dark:bg-teal-800' : 'bg-gray-100 dark:bg-gray-800/50'} ${tradeSource !== 'free-agents' && hasMatchesStarted ? 'opacity-50 grayscale' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="truncate max-w-[80px] font-bold">{p.name} {p.isForeign ? '✈️' : ''}</span>
                                        <span className="font-semibold text-xs">{p.battingSkill}</span>
                                    </div>
                                    <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/5 flex flex-col gap-0.5">
                                        <div className="flex justify-between text-[8px] text-gray-500">
                                            <span>Base: {bp.toFixed(2)} Cr</span>
                                            <span className="text-teal-500 font-bold">Value: {val.toFixed(2)} Cr</span>
                                        </div>
                                        {tradeSource === 'free-agents' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); signPlayer(p); }}
                                                className="mt-1 w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 py-1 rounded border border-teal-500/20 text-[9px] font-black uppercase"
                                            >
                                                Sign Player
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

             {tradeSource !== 'free-agents' && !hasMatchesStarted && (
                <div className="mt-2">
                    <button 
                        onClick={handleTrade}
                        disabled={!playerToTradeOut || !playerToTradeIn}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Propose Trade
                    </button>
                    <div className="text-center text-xs text-gray-500 mt-1">
                        <p>{playerToTradeOut ? `Trading: ${playerToTradeOut.name}` : 'Select a player from your squad'}</p>
                        <p>{playerToTradeIn ? `Receiving: ${playerToTradeIn.name}` : `Select a player from ${gameData.teams.find(t=>t.id === tradeSource)?.name || ''}`}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transfers;