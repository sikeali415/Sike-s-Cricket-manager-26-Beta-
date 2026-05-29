import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Team, GameData, PlayerRole, Format } from '../types';
import { getRoleColor, getRoleFullName } from '../utils';
import { Icons } from './Icons';

interface AuctionRoomProps {
    gameData: GameData;
    onAuctionComplete: (updatedTeams: Team[]) => void;
}

const STARTING_PURSE = 100.0;
const MAX_FOREIGN_LIMIT = 5;
const MAX_SQUAD_SIZE = 18;

// Targeted Balanced Squad Ratios
const TARGET_KEEPERS = 1;
const TARGET_ALL_ROUNDERS = 3;
const TARGET_SPINNERS = 3;
const TARGET_FAST = 5;

const AuctionRoom: React.FC<AuctionRoomProps> = ({ gameData, onAuctionComplete }) => {
    const mainTeamIds = useMemo(() => 
        gameData.allTeamsData.filter(td => !td.isYouthTeam).map(td => td.id), 
    [gameData.allTeamsData]);

    const [teams, setTeams] = useState<Team[]>(() => 
        gameData.teams.map(t => ({ ...t, squad: t.squad || [], purse: t.purse || STARTING_PURSE }))
    );

    const [activeOverlay, setActiveOverlay] = useState<'none' | 'franchises' | 'pool'>('none');
    const [isBiddingWar, setIsBiddingWar] = useState(false);

    // Filter out retained players and stabilize the pool
    const [initialSortedPool] = useState(() => {
        const retainedPlayerIds = new Set(teams.flatMap(t => t.squad.map(p => p.id)));
        const allAvailable = gameData.allPlayers.filter(pl => !retainedPlayerIds.has(pl.id));
        
        return allAvailable.sort((a, b) => {
            const skillA = Math.max(a.battingSkill, a.secondarySkill);
            const skillB = Math.max(b.battingSkill, b.secondarySkill);
            return skillB - skillA;
        });
    });

    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [currentBid, setCurrentBid] = useState(0);
    const [highestBidderId, setHighestBidderId] = useState<string | null>(null);
    const [isAuctioning, setIsAuctioning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [biddingLog, setBiddingLog] = useState<string[]>(["Welcome to the 2026 Draft Room. Awaiting Lot #1..."]);
    const [auctionFinished, setAuctionFinished] = useState(false);
    const [currentLotBids, setCurrentLotBids] = useState<{teamName: string, bid: number}[]>([]);
    const [countdown, setCountdown] = useState<number>(3);

    const currentPlayer = initialSortedPool[currentPlayerIdx] || null;
    const userTeam = teams.find(t => t.id === gameData.userTeamId);

    const getBidIncrement = (current: number) => {
        if (current < 1.0) return 0.25; // 25 lac (0.25 Cr)
        if (current < 5.0) return 0.50; // 50 lac (0.50 Cr)
        if (current < 10.0) return 1.00; // 1 Cr
        return 2.00; // 2 Cr
    };

    const canBid = useMemo(() => {
        if (!userTeam || !isAuctioning || !currentPlayer) return false;
        if (highestBidderId === userTeam.id) return false;
        if (userTeam.squad.length >= MAX_SQUAD_SIZE) return false;
        if (currentPlayer.isForeign && userTeam.squad.filter(p => p.isForeign).length >= MAX_FOREIGN_LIMIT) return false;
        
        const increment = getBidIncrement(currentBid);
        const nextBid = Number((currentBid + increment).toFixed(2));
        if (userTeam.purse < nextBid) return false;

        return true;
    }, [userTeam, isAuctioning, currentPlayer, highestBidderId, currentBid]);

    const getBasePrice = (player: Player) => {
        const rating = Math.max(player.battingSkill, player.secondarySkill);
        if (rating >= 80) return 2.0;
        if (rating >= 70) return 1.0;
        if (rating >= 60) return 0.5;
        return 0.25;
    };

    const getPlayerValuation = useCallback((player: Player, team: Team) => {
        const rating = Math.max(player.battingSkill, player.secondarySkill);
        const skillFactor = Math.pow(rating / 50, 4);
        const baseValuation = skillFactor * 2.5;

        // Needs factor
        const squad = team.squad || [];
        const roleCount = squad.filter(p => p.role === player.role).length;
        let targetCount = 3;
        if (player.role === PlayerRole.BATSMAN) targetCount = 6;
        if (player.role === PlayerRole.WICKET_KEEPER) targetCount = TARGET_KEEPERS;
        if (player.role === PlayerRole.ALL_ROUNDER) targetCount = TARGET_ALL_ROUNDERS;
        if (player.role === PlayerRole.SPIN_BOWLER) targetCount = TARGET_SPINNERS;
        if (player.role === PlayerRole.FAST_BOWLER) targetCount = TARGET_FAST;

        let needFactor = 1.0;
        if (roleCount >= targetCount + 1) needFactor = 0.4;
        else if (roleCount < targetCount / 2) needFactor = 1.8;

        if (player.isForeign) {
            const foreignCount = squad.filter(p => p.isForeign).length;
            if (foreignCount >= MAX_FOREIGN_LIMIT) return 0;
            if (foreignCount === MAX_FOREIGN_LIMIT - 1) needFactor *= 0.6;
        }

        const personalityJitter = 0.8 + (Math.random() * 0.6);
        return baseValuation * needFactor * personalityJitter;
    }, []);

    const startNextPlayer = useCallback(() => {
        if (auctionFinished || isProcessing) return;

        if (currentPlayerIdx >= initialSortedPool.length) {
            setAuctionFinished(true);
            return;
        }

        const player = initialSortedPool[currentPlayerIdx];
        if (!player) {
            setCurrentPlayerIdx(prev => prev + 1);
            return;
        }

        const bp = getBasePrice(player);
        setCurrentBid(bp);
        setHighestBidderId(null);
        setIsAuctioning(true);
        setIsProcessing(false);
        setCurrentLotBids([]);
        setCountdown(3);
        setIsBiddingWar(false);
        setBiddingLog(prev => [`Lot #${currentPlayerIdx + 1}: ${player.name} up for ${bp.toFixed(2)} Cr`, ...prev.slice(0, 10)]);
    }, [currentPlayerIdx, initialSortedPool, auctionFinished, isProcessing]);

    const handleUserBid = () => {
        if (!userTeam || !isAuctioning || !currentPlayer) return;
        
        const increment = getBidIncrement(currentBid);
        const nextBid = Number((currentBid + increment).toFixed(2));
        if (userTeam.purse < nextBid) return;
        
        setCurrentBid(nextBid);
        setHighestBidderId(userTeam.id);
        setCurrentLotBids(prev => [{teamName: userTeam.name, bid: nextBid}, ...prev]);
        setCountdown(3);
        setBiddingLog(prev => [`${userTeam.name} bids ${nextBid.toFixed(2)} Cr!`, ...prev.slice(0, 10)]);
    };

    const skipPlayer = () => {
        if (!currentPlayer || !isAuctioning || isProcessing) return;
        setBiddingLog(prev => [`Skipping ${currentPlayer.name}...`, ...prev.slice(0, 10)]);
        setCurrentPlayerIdx(prev => prev + 1);
    };

    const autoAuctionRemaining = () => {
        setIsAuctioning(false);
        setIsProcessing(true);
        setAuctionFinished(true);
        onAuctionComplete(teams); // In a real app we'd auto-fill here, but for now we just finish
    };

    useEffect(() => {
        if (!isAuctioning || !currentPlayer || auctionFinished) return;

        const timer = setTimeout(() => {
            const increment = getBidIncrement(currentBid);
            const eligibleTeams = teams.filter(t => 
                mainTeamIds.includes(t.id) &&
                t.id !== highestBidderId && 
                t.purse >= (currentBid + increment) &&
                t.squad.length < MAX_SQUAD_SIZE &&
                (!currentPlayer.isForeign || t.squad.filter(p => p.isForeign).length < MAX_FOREIGN_LIMIT)
            );

            if (eligibleTeams.length > 0) {
                const biddingTeam = eligibleTeams.find(t => {
                    if (t.id === gameData.userTeamId) return false;
                    const valuation = getPlayerValuation(currentPlayer, t);
                    return (currentBid + increment) <= valuation;
                });

                if (biddingTeam) {
                    const nextBid = Number((currentBid + increment).toFixed(2));
                    setCurrentBid(nextBid);
                    setHighestBidderId(biddingTeam.id);
                    setCurrentLotBids(prev => [{teamName: biddingTeam.name, bid: nextBid}, ...prev]);
                    setCountdown(3);
                    setIsBiddingWar(true);
                    setBiddingLog(prev => [`${biddingTeam.name} bids ${nextBid.toFixed(2)} Cr!`, ...prev.slice(0, 10)]);
                } else {
                    if (countdown > 1) {
                        setCountdown(prev => prev - 1);
                        setBiddingLog(prev => [`Going ${countdown === 3 ? 'once' : 'twice'} at ${currentBid.toFixed(2)} Cr...`, ...prev.slice(0, 10)]);
                    } else {
                        if (highestBidderId) sellPlayer();
                        else unsoldPlayer();
                    }
                }
            } else {
                if (countdown > 1) {
                    setCountdown(prev => prev - 1);
                } else {
                    if (highestBidderId) sellPlayer();
                    else unsoldPlayer();
                }
            }
        }, 1000 + Math.random() * 1000);

        return () => clearTimeout(timer);
    }, [isAuctioning, currentBid, highestBidderId, currentPlayer, countdown, teams]);

    const sellPlayer = () => {
        setIsAuctioning(false);
        setIsProcessing(true);
        const winner = teams.find(t => t.id === highestBidderId);
        if (winner && currentPlayer) {
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) {
                    return {
                        ...t,
                        purse: Number((t.purse - currentBid).toFixed(2)),
                        squad: [...t.squad, currentPlayer]
                    };
                }
                return t;
            }));
            setBiddingLog(prev => [`🎉 SOLD! ${currentPlayer.name} to ${winner.name} for ${currentBid.toFixed(2)} Cr`, ...prev.slice(0, 10)]);
        }
        setTimeout(() => {
            setCurrentPlayerIdx(prev => prev + 1);
            setIsProcessing(false);
        }, 1500);
    };

    const unsoldPlayer = () => {
        setIsAuctioning(false);
        setIsProcessing(true);
        setBiddingLog(prev => [`❌ UNSOLD: ${currentPlayer.name}`, ...prev.slice(0, 10)]);
        setTimeout(() => {
            setCurrentPlayerIdx(prev => prev + 1);
            setIsProcessing(false);
        }, 1500);
    };

    useEffect(() => {
        if (!isAuctioning && !auctionFinished && !isProcessing) {
            startNextPlayer();
        }
    }, [currentPlayerIdx, isAuctioning, auctionFinished, isProcessing, startNextPlayer]);

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white font-sans overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <div className="p-4 pt-12 flex justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/5 relative z-10">
                <div>
                    <h1 className="text-xs font-black uppercase tracking-widest text-teal-500">Draft Room</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black italic uppercase tracking-tight">Session 1</span>
                        {isBiddingWar && (
                            <motion.span 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                                className="bg-rose-500 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase"
                            >
                                Bidding War ⚡
                            </motion.span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-black text-slate-500 block">Your Purse</span>
                    <span className="text-2xl font-black text-teal-400 leading-none">{userTeam?.purse.toFixed(2)}<span className="text-xs ml-1">Cr</span></span>
                </div>
            </div>

            {/* Main Auction Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative z-10">
                <AnimatePresence mode="wait">
                    {!auctionFinished && currentPlayer ? (
                        <motion.div
                            key={currentPlayer.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            className="w-full max-w-sm"
                        >
                            {/* Player Card */}
                            <div className="bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative">
                                <div className={`h-2 w-full ${getRoleColor(currentPlayer.role)} bg-opacity-80`} />
                                
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-white/5">
                                            {getRoleFullName(currentPlayer.role)} {currentPlayer.isForeign ? '✈️' : ''}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 uppercase font-black">Skill Rate</span>
                                            <div className="text-lg font-black text-teal-500">
                                                {Math.max(currentPlayer.battingSkill, currentPlayer.secondarySkill)}
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-center">
                                        {currentPlayer.name}
                                    </h2>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-slate-800/50 p-2 rounded-2xl text-center">
                                            <span className="text-[8px] text-slate-500 font-black uppercase">Batting</span>
                                            <div className="text-lg font-black">{currentPlayer.battingSkill}</div>
                                        </div>
                                        <div className="bg-slate-800/50 p-2 rounded-2xl text-center">
                                            <span className="text-[8px] text-slate-500 font-black uppercase">Bowling</span>
                                            <div className="text-lg font-black">{currentPlayer.secondarySkill}</div>
                                        </div>
                                    </div>

                                    {/* Bid Display */}
                                    <div className="bg-black/60 backdrop-blur-xl rounded-[24px] p-6 text-center border border-white/10 mb-6 relative overflow-hidden shadow-inner">
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: [0.1, 0.3, 0.1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute inset-0 bg-gradient-to-t from-teal-500/10 to-transparent"
                                        />
                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] block mb-2 opacity-80">
                                            {highestBidderId ? 'CURRENT HIGHEST BID' : 'STARTING PRICE'}
                                        </span>
                                        <motion.div 
                                            key={currentBid}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="text-7xl font-black tabular-nums tracking-tighter text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                                        >
                                            {currentBid.toFixed(2)}<span className="text-2xl ml-1 opacity-40">Cr</span>
                                        </motion.div>
                                        <div className="mt-3 text-[11px] font-black text-teal-400 uppercase tracking-widest truncate">
                                            {highestBidderId ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                                                    {teams.find(t => t.id === highestBidderId)?.name}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">Wait for opening...</span>
                                            )}
                                        </div>
                                        
                                        {/* Countdown Bar */}
                                        {isAuctioning && (
                                            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div 
                                                    key={`${currentPlayer.id}-${currentBid}`}
                                                    initial={{ width: '100%' }}
                                                    animate={{ width: '0%' }}
                                                    transition={{ duration: 3, ease: 'linear' }}
                                                    className={`h-full ${countdown === 1 ? 'bg-rose-500' : 'bg-teal-500'}`}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-4">
                                        <button 
                                            onClick={handleUserBid}
                                            disabled={!canBid}
                                            className={`w-full py-5 rounded-[20px] font-black text-2xl italic uppercase tracking-tighter shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group ${
                                                !canBid 
                                                ? 'bg-slate-800 text-slate-600 border border-white/5 cursor-not-allowed opacity-50' 
                                                : 'bg-teal-500 text-black hover:bg-teal-400 shadow-teal-500/30'
                                            }`}
                                        >
                                            {canBid && <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} />}
                                            <span className="relative z-10 flex items-center gap-2">
                                                <Icons.PlusCircle />
                                                {canBid ? `BID ${ (currentBid + getBidIncrement(currentBid)).toFixed(2) } Cr` : 'CANNOT BID'}
                                            </span>
                                        </button>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={skipPlayer}
                                                className="bg-slate-800/80 hover:bg-slate-700 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all active:scale-95"
                                            >
                                                Skip / Pass
                                            </button>
                                            <button 
                                                onClick={() => setActiveOverlay('franchises')}
                                                className="bg-slate-900/50 hover:bg-slate-800 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Icons.Lineups className="h-3 w-3" /> Team Status
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center">
                            <div className="text-6xl mb-4">🏠</div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Draft Completed</h2>
                            <p className="text-slate-500 text-sm mb-8">All squads are finalized for Season 1 Launch.</p>
                            <button 
                                onClick={() => onAuctionComplete(teams)}
                                className="bg-teal-500 text-black font-black px-12 py-4 rounded-2xl text-xl italic uppercase tracking-tighter shadow-xl shadow-teal-500/20"
                            >
                                Proceed to Hub
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Log */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/5 h-40">
                <div className="text-[10px] font-black uppercase text-slate-600 mb-2 flex justify-between">
                    <span>Live Activity Feed</span>
                    <button onClick={autoAuctionRemaining} className="text-rose-400 hover:text-rose-300">Fast Auto-Fill</button>
                </div>
                <div className="space-y-1 overflow-y-auto h-24 font-mono text-[10px] scrollbar-hide">
                    {biddingLog.map((log, i) => (
                        <div key={i} className={`${i === 0 ? 'text-teal-400' : 'text-slate-500'} border-b border-white/5 pb-1`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>

            {/* Rosters Overlay */}
            <AnimatePresence>
                {activeOverlay === 'franchises' && (
                    <motion.div 
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
                    >
                        <div className="p-4 pt-12 flex justify-between items-center border-b border-white/5">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">Team Rosters</h2>
                            <button onClick={() => setActiveOverlay('none')} className="bg-slate-800 p-2 rounded-full"><Icons.X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                            {teams.map(team => (
                                <div key={team.id} className={`p-4 rounded-3xl border ${team.id === gameData.userTeamId ? 'bg-teal-500/10 border-teal-500/50' : 'bg-slate-900 border-white/5'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-black uppercase tracking-tight text-sm">{team.name}</h3>
                                        <span className="text-teal-400 font-bold">{team.purse.toFixed(1)} Cr</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {team.squad.map(p => (
                                            <div key={p.id} className="text-[10px] bg-slate-800 px-2 py-1 rounded-md border border-white/5">
                                                {p.name}
                                            </div>
                                        ))}
                                        {team.squad.length === 0 && <span className="text-[10px] text-slate-600 italic">No signings yet...</span>}
                                    </div>
                                    <div className="mt-2 text-[8px] font-black uppercase text-slate-500">
                                        Squad Size: {team.squad.length}/18
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuctionRoom;