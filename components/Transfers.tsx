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
        
        const costValue = (player.basePrice || getPlayerBasePrice(player)) * 6; // Rule: 6x Base Price
        if (selectedTeam.purse < costValue) {
            showFeedback(`Insufficient funds! Need ${costValue} Cr. to sign ${player.name}`, "error");
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
                        purse: Number((t.purse - costValue).toFixed(2))
                    };
                }
                return t;
            });
            return { ...prev, teams: newTeams };
        });
        showFeedback(`Signed ${player.name} for ${costValue} Crore!`, "success");
    };

    const rightPanelList = tradeSource === 'free-agents' ? freeAgents : (gameData.teams.find(t => t.id === tradeSource)?.squad || []);

    const hasMatchesStarted = gameData.matchResults[gameData.currentFormat].some(r => r.winnerId === userTeam.id || r.loserId === userTeam.id);

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">Team Management</h2>
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
            <div className="mb-2">
                 <select 
                    value={selectedTeamId} 
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                >
                    {gameData.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-grow overflow-hidden">
                <div className="flex flex-col overflow-hidden">
                    <h3 className="font-semibold text-center mb-1">{selectedTeam.name} ({selectedTeam.squad.length}/{LOCAL_MAX_SQUAD_SIZE})</h3>
                    <ul className="space-y-1 overflow-y-auto pr-1">
                        {selectedTeam.squad.map(p => (
                            <li key={p.id} 
                                onClick={() => tradeSource !== 'free-agents' && !hasMatchesStarted && setPlayerToTradeOut(p)}
                                className={`flex items-center p-1 rounded-md text-sm cursor-pointer ${playerToTradeOut?.id === p.id ? 'bg-teal-200 dark:bg-teal-800' : 'bg-gray-100 dark:bg-gray-800/50'} ${tradeSource !== 'free-agents' && hasMatchesStarted ? 'opacity-50 grayscale' : ''}`}
                            >
                                <span className="flex-grow truncate">{p.name} {p.isForeign ? '(F)' : ''}</span>
                                <span className="font-semibold mr-2">{p.battingSkill}</span>
                                {tradeSource === 'free-agents' && <button onClick={() => releasePlayer(p.id)}><Icons.RemoveCircle /></button>}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col overflow-hidden">
                    <select 
                        value={tradeSource} 
                        onChange={e => setTradeSource(e.target.value)}
                        className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 mb-1"
                    >
                        <option value="free-agents">Free Agents</option>
                        {gameData.teams.filter(t => t.id !== selectedTeamId).map(team => (
                            <option key={team.id} value={team.id} disabled={hasMatchesStarted}>{team.name}</option>
                        ))}
                    </select>
                     <ul className="space-y-1 overflow-y-auto pr-1">
                        {rightPanelList.map(p => (
                            <li key={p.id} 
                                onClick={() => tradeSource !== 'free-agents' && !hasMatchesStarted && setPlayerToTradeIn(p)}
                                className={`flex items-center p-1 rounded-md text-sm cursor-pointer ${playerToTradeIn?.id === p.id ? 'bg-teal-200 dark:bg-teal-800' : 'bg-gray-100 dark:bg-gray-800/50'} ${tradeSource !== 'free-agents' && hasMatchesStarted ? 'opacity-50 grayscale' : ''}`}
                            >
                                <span className="flex-grow truncate">{p.name} {p.isForeign ? '(F)' : ''}</span>
                                <span className="font-semibold mr-2">{p.battingSkill}</span>
                                {tradeSource === 'free-agents' && <button onClick={() => signPlayer(p)}><Icons.PlusCircle /></button>}
                            </li>
                        ))}
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