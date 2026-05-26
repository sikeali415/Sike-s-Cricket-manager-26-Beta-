import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameData, Format, Player, Team } from '../types';
import { Icons } from './Icons';
import { getRoleFullName, getPlayerBasePrice, getPlayerMarketPrice } from '../utils';
import { calculateSeasonAwards } from '../utils/awardUtils';

interface EndOfFormatScreenProps {
    gameData: GameData;
    handleFormatChange: (newFormat: Format) => void;
    handleEndSeason: (retainedPlayers: Player[]) => void;
}

const EndOfFormatScreen: React.FC<EndOfFormatScreenProps> = ({ gameData, handleFormatChange, handleEndSeason }) => {
    const [view, setView] = useState<'awards' | 'retention'>('awards');
    const [retentionTab, setRetentionTab] = useState<'retain' | 'directSign'>('retain');
    const [retainedIds, setRetainedIds] = useState<Set<string>>(new Set());
    
    // Direct Signing States (1 Foreign and 1 Local max)
    const [selectedForeignSignId, setSelectedForeignSignId] = useState<string>('');
    const [selectedLocalSignId, setSelectedLocalSignId] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const userTeam = useMemo(() => gameData.teams.find(t => t.id === gameData.userTeamId), [gameData]);
    
    const lastAward = useMemo(() => {
        const found = gameData.awardsHistory.find(a => a.season === gameData.currentSeason && a.format === gameData.currentFormat);
        if (found) return found;

        try {
            return calculateSeasonAwards(gameData, gameData.currentFormat);
        } catch (e) {
            return gameData.awardsHistory[gameData.awardsHistory.length - 1];
        }
    }, [gameData.awardsHistory, gameData.currentSeason, gameData.currentFormat]);
    
    const formatsOrder = [
        Format.T20, Format.ODI, Format.SHIELD
    ];

    const currentIdx = formatsOrder.indexOf(gameData.currentFormat);
    const nextFormat = currentIdx !== -1 && currentIdx < formatsOrder.length - 1 ? formatsOrder[currentIdx + 1] : null;

    // Standard Retention Players
    const retainedPlayersList = useMemo(() => {
        return userTeam?.squad.filter(p => retainedIds.has(p.id)) || [];
    }, [userTeam, retainedIds]);

    const nationalCount = useMemo(() => retainedPlayersList.filter(p => !p.isForeign).length, [retainedPlayersList]);
    const internationalCount = useMemo(() => retainedPlayersList.filter(p => p.isForeign).length, [retainedPlayersList]);

    const totalRetentionCost = useMemo(() => {
        return retainedPlayersList.reduce((sum, p) => sum + getPlayerMarketPrice(p), 0);
    }, [retainedPlayersList]);

    // Eligible players from OTHER teams for Direct Signings
    const availablePlayersPool = useMemo(() => {
        const userSquadIds = new Set(userTeam?.squad.map(p => p.id) || []);
        return gameData.allPlayers.filter(p => !userSquadIds.has(p.id));
    }, [gameData.allPlayers, userTeam]);

    const availableForeignPlayers = useMemo(() => {
        return availablePlayersPool.filter(p => p.isForeign).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    }, [availablePlayersPool]);

    const availableLocalPlayers = useMemo(() => {
        return availablePlayersPool.filter(p => !p.isForeign).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    }, [availablePlayersPool]);

    const directSignedForeign = useMemo(() => {
        return gameData.allPlayers.find(p => p.id === selectedForeignSignId) || null;
    }, [gameData.allPlayers, selectedForeignSignId]);

    const directSignedLocal = useMemo(() => {
        return gameData.allPlayers.find(p => p.id === selectedLocalSignId) || null;
    }, [gameData.allPlayers, selectedLocalSignId]);

    const directSignCost = useMemo(() => {
        let cost = 0;
        if (directSignedForeign) {
            cost += getPlayerBasePrice(directSignedForeign) * 10;
        }
        if (directSignedLocal) {
            cost += getPlayerBasePrice(directSignedLocal) * 10;
        }
        return cost;
    }, [directSignedForeign, directSignedLocal]);

    const toggleRetention = (id: string) => {
        const player = userTeam?.squad.find(p => p.id === id);
        if (!player) return;
        setErrorMessage(null);

        setRetainedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                const alreadySelected = userTeam?.squad.filter(p => next.has(p.id)) || [];
                const nextCost = alreadySelected.reduce((sum, p) => sum + getPlayerMarketPrice(p), 0) + getPlayerMarketPrice(player);
                
                if (nextCost > 30.0) {
                    setErrorMessage("Pre-season retention budget would exceed 30.0 Crore limit!");
                    return prev;
                }

                const natCount = alreadySelected.filter(p => !p.isForeign).length;
                const intCount = alreadySelected.filter(p => p.isForeign).length;

                if (player.isForeign) {
                    if (intCount < 1) {
                        next.add(id);
                    } else {
                        setErrorMessage("Max 1 foreign/international retention allowed!");
                    }
                } else {
                    if (natCount < 3) {
                        next.add(id);
                    } else {
                        setErrorMessage("Max 3 national/local retentions allowed!");
                    }
                }
            }
            return next;
        });
    };

    const finalizeSeason = () => {
        if (totalRetentionCost > 30.0) {
            setErrorMessage("Standard core retention cost exceeds the 30 Crores preseason retention budget limit!");
            return;
        }

        const finalRetained = userTeam?.squad.filter(p => retainedIds.has(p.id)) || [];
        const finalDirectSigned: Player[] = [];
        if (directSignedForeign) finalDirectSigned.push(directSignedForeign);
        if (directSignedLocal) finalDirectSigned.push(directSignedLocal);

        const combinedKeptList = [...finalRetained, ...finalDirectSigned];
        handleEndSeason(combinedKeptList);
    };

    if (view === 'retention') {
        return (
            <div className="p-6 h-full flex flex-col bg-slate-950 text-white overflow-hidden">
                <div className="mb-4">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-1">Pre-Season HQ</h2>
                    <p className="text-slate-400 text-[11px] uppercase tracking-widest leading-none">Assemble your foundation and secure premium marquee signings.</p>
                </div>

                {/* Main Tabs */}
                <div className="flex border-b border-slate-800 mb-4 gap-2">
                    <button 
                        onClick={() => { setRetentionTab('retain'); setErrorMessage(null); }}
                        className={`flex-1 py-3 text-xs uppercase font-black tracking-widest border-b-2 text-center transition-all ${retentionTab === 'retain' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Core Retentions ({retainedIds.size}/4)
                    </button>
                    <button 
                        onClick={() => { setRetentionTab('directSign'); setErrorMessage(null); }}
                        className={`flex-1 py-3 text-xs uppercase font-black tracking-widest border-b-2 text-center transition-all ${retentionTab === 'directSign' ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        Direct Marquee (10x Base)
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2 font-mono">
                        <span className="animate-pulse">⚠️</span> {errorMessage}
                    </div>
                )}

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1">
                    {retentionTab === 'retain' ? (
                        <div className="space-y-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 leading-tight">
                                Retained players are kept on with realistic <strong>market valuations</strong> based on historical parameters. Max spend: 30.0 Cr.
                            </p>
                            {userTeam?.squad.map(p => {
                                const isRetained = retainedIds.has(p.id);
                                const marketPrice = getPlayerMarketPrice(p);
                                const canRetain = isRetained || (p.isForeign ? internationalCount < 1 : nationalCount < 3);
                                
                                return (
                                    <div 
                                        key={p.id} 
                                        onClick={() => toggleRetention(p.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${isRetained ? 'bg-teal-500/10 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.15)]' : canRetain ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-slate-900/30 border-slate-900/50 opacity-40'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm flex items-center gap-2">
                                                    {p.name} {p.isForeign ? '✈️' : ''}
                                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-normal">Skl: {Math.max(p.battingSkill, p.secondarySkill)}</span>
                                                </p>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold mt-1">
                                                    {getRoleFullName(p.role)} • {p.isForeign ? 'International' : 'National'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xs font-black tracking-widest ${isRetained ? 'text-teal-400' : 'text-slate-500'}`}>
                                                    {isRetained ? 'RETAINED' : 'RELEASED'}
                                                </div>
                                                <div className="text-[10px] text-teal-500 font-mono mt-1 font-bold">
                                                    CR: {marketPrice.toFixed(1)} Cr
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="bg-gradient-to-r from-teal-950/20 to-slate-900 border border-teal-500/20 p-4 rounded-2xl">
                                <h3 className="text-xs font-black uppercase text-teal-400 tracking-wider mb-1 flex items-center gap-2">
                                    🌟 Direct Marquee Signings
                                </h3>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                                    Directly sign exactly <strong>one Foreign</strong> and <strong>one Local</strong> champion from the open pool immediately. To claim premium priority before the auction floor opens, these players require a pre-season fee of <strong>10x of their base prices</strong>.
                                </p>
                            </div>

                            {/* Foreign Dropdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block">
                                    Direct Sign: 1x Marquee Foreign Player
                                </label>
                                <select 
                                    value={selectedForeignSignId}
                                    onChange={(e) => { setSelectedForeignSignId(e.target.value); setErrorMessage(null); }}
                                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
                                >
                                    <option value="">-- None Selected --</option>
                                    {availableForeignPlayers.map(p => {
                                        const bp = getPlayerBasePrice(p);
                                        const fee = bp * 10;
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Skl: {Math.max(p.battingSkill, p.secondarySkill)}) - Fee: {fee.toFixed(1)} Cr
                                            </option>
                                        );
                                    })}
                                </select>
                                {directSignedForeign && (
                                    <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/20 text-[11px] font-mono flex justify-between items-center text-teal-300">
                                        <span>{directSignedForeign.name} ({getRoleFullName(directSignedForeign.role)})</span>
                                        <strong>Cost: {(getPlayerBasePrice(directSignedForeign) * 10).toFixed(1)} Cr</strong>
                                    </div>
                                )}
                            </div>

                            {/* Local Dropdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block">
                                    Direct Sign: 1x Marquee Local Player
                                </label>
                                <select 
                                    value={selectedLocalSignId}
                                    onChange={(e) => { setSelectedLocalSignId(e.target.value); setErrorMessage(null); }}
                                    className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
                                >
                                    <option value="">-- None Selected --</option>
                                    {availableLocalPlayers.map(p => {
                                        const bp = getPlayerBasePrice(p);
                                        const fee = bp * 10;
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Skl: {Math.max(p.battingSkill, p.secondarySkill)}) - Fee: {fee.toFixed(1)} Cr
                                            </option>
                                        );
                                    })}
                                </select>
                                {directSignedLocal && (
                                    <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/20 text-[11px] font-mono flex justify-between items-center text-teal-300">
                                        <span>{directSignedLocal.name} ({getRoleFullName(directSignedLocal.role)})</span>
                                        <strong>Cost: {(getPlayerBasePrice(directSignedLocal) * 10).toFixed(1)} Cr</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pre-Season Summary Metrics Dashboard */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-500 block leading-none mb-1">Retention Purse</span>
                        <span className={`text-sm font-black italic tracking-tight ${totalRetentionCost > 30.0 ? 'text-red-400' : 'text-teal-400'}`}>
                            {totalRetentionCost.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">/ 30m</span>
                        </span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-500 block leading-none mb-1">Direct Marquees</span>
                        <span className="text-sm font-black italic tracking-tight text-white">
                            {directSignCost.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">Cr</span>
                        </span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-500 block leading-none mb-1">Season Budget Left</span>
                        <span className="text-sm font-black italic tracking-tight text-yellow-400">
                            {(100.0 - (totalRetentionCost + directSignCost)).toFixed(1)} <span className="text-[10px] font-normal text-slate-500">/ 100</span>
                        </span>
                    </div>
                </div>

                <button 
                    onClick={finalizeSeason}
                    disabled={totalRetentionCost > 30.0}
                    className="w-full bg-teal-500 py-5 rounded-3xl text-lg font-black italic uppercase tracking-tighter shadow-2xl hover:bg-teal-400 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-slate-950"
                >
                    Finalize & Start {gameData.currentFormat === Format.SHIELD ? 'Season Draft' : 'Auction Draft'}
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 text-center flex flex-col justify-between h-full bg-slate-900 overflow-y-auto">
            <div>
                <h2 className="text-3xl font-bold mb-2 text-white">{lastAward?.format} Complete!</h2>
                <div className="my-4 bg-yellow-400/20 border-2 border-yellow-500 rounded-2xl p-6">
                    <p className="text-lg font-semibold text-yellow-300">Champions</p>
                    <p className="text-4xl font-black italic uppercase tracking-tighter text-white">{lastAward?.winnerTeamName}</p>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-400/10 border-2 border-blue-500/30 rounded-2xl p-4">
                        <p className="font-bold text-blue-400 text-xs uppercase mb-1">Orange Cap</p>
                        <p className="font-bold text-white truncate text-xs">{lastAward?.bestBatter.playerName}</p>
                        <p className="text-xl font-black text-white">{lastAward?.bestBatter.runs} Runs</p>
                    </div>
                    <div className="bg-purple-400/10 border-2 border-purple-500/30 rounded-2xl p-4">
                         <p className="font-bold text-purple-400 text-xs uppercase mb-1">Purple Cap</p>
                        <p className="font-bold text-white truncate text-xs">{lastAward?.bestBowler.playerName}</p>
                        <p className="text-xl font-black text-white">{lastAward?.bestBowler.wickets} Wickets</p>
                    </div>
                    <div className="bg-orange-400/10 border-2 border-orange-500/30 rounded-2xl p-4">
                         <p className="font-bold text-orange-400 text-xs uppercase mb-1">Power Hitter</p>
                        <p className="font-bold text-white truncate text-xs">{lastAward?.powerHitter?.playerName}</p>
                        <p className="text-xl font-black text-white">{lastAward?.powerHitter?.sixes} Sixes</p>
                    </div>
                    <div className="bg-teal-400/10 border-2 border-teal-500/30 rounded-2xl p-4">
                         <p className="font-bold text-teal-400 text-xs uppercase mb-1">Tournament MVP</p>
                        <p className="font-bold text-white truncate text-xs">{lastAward?.playerOfSeason?.playerName}</p>
                        <p className="text-xl font-black text-white">{lastAward?.playerOfSeason?.impact} Points</p>
                    </div>
                </div>
            </div>
            <div className="mt-6 space-y-4">
                {nextFormat ? (
                    <button onClick={() => handleFormatChange(nextFormat)} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-5 px-10 text-xl rounded-2xl shadow-lg uppercase italic tracking-tighter">
                        Proceed to {nextFormat}
                    </button>
                ) : (
                    <button onClick={() => setView('retention')} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-5 px-10 text-xl rounded-2xl shadow-lg uppercase italic tracking-tighter">
                        End Season & Retain Players
                    </button>
                )}
            </div>
        </div>
    );
};

export default EndOfFormatScreen;
