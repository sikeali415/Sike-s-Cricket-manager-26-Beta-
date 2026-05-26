import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Player, Team, GameData, PlayerRole, Format } from '../types';
import { getRoleColor, getRoleFullName, aggregateStats } from '../utils';
import { Icons } from './Icons';

interface AuctionRoomProps {
    gameData: GameData;
    onAuctionComplete: (updatedTeams: Team[]) => void;
}

const STARTING_PURSE = 100.0;
const MAX_FOREIGN_LIMIT = 5; // Match App.tsx
const MAX_SQUAD_SIZE = 18;
const MIN_SQUAD_SIZE = 12;

// Targeted Balanced Squad Ratios
const TARGET_OPENERS = 4;
const TARGET_BATTERS = 7; // specialists total
const TARGET_KEEPERS = 1;
const TARGET_ALL_ROUNDERS = 3;
const TARGET_SPINNERS = 3;
const TARGET_FAST = 5;

// Helper to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const AuctionRoom: React.FC<AuctionRoomProps> = ({ gameData, onAuctionComplete }) => {
    const mainTeamIds = useMemo(() => 
        gameData.allTeamsData.filter(td => !td.isYouthTeam).map(td => td.id), 
    [gameData.allTeamsData]);

    const [teams, setTeams] = useState<Team[]>(() => 
        gameData.teams.map(t => ({ ...t, squad: t.squad || [], purse: t.purse || STARTING_PURSE }))
    );

    const [activeOverlay, setActiveOverlay] = useState<'none' | 'franchises' | 'pool'>('none');

    // Sorted Pool with priority for last season performers
    const sortedPool = useMemo(() => {
        const retainedPlayerIds = new Set(teams.flatMap(t => t.squad.map(p => p.id)));
        const allAvailable = gameData.allPlayers.filter(pl => !retainedPlayerIds.has(pl.id));
        
        // Priority Top 50 Performers (Batters and Bowlers)
        const topBatters = [...gameData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.runs || 0) - (a.stats[Format.T20]?.runs || 0)).slice(0, 50).map(p => p.id);
        const topBowlers = [...gameData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.wickets || 0) - (a.stats[Format.T20]?.wickets || 0)).slice(0, 50).map(p => p.id);
        const priorityIds = new Set([...topBatters, ...topBowlers]);

        return allAvailable.sort((a, b) => {
            const isAPriority = priorityIds.has(a.id);
            const isBPriority = priorityIds.has(b.id);

            if (isAPriority && !isBPriority) return -1;
            if (!isAPriority && isBPriority) return 1;

            const skillA = Math.max(a.battingSkill, a.secondarySkill);
            const skillB = Math.max(b.battingSkill, b.secondarySkill);
            return skillB - skillA;
        });
    }, [gameData.allPlayers, teams]);

    const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
    const [currentBid, setCurrentBid] = useState(0);
    const [highestBidderId, setHighestBidderId] = useState<string | null>(null);
    const [isAuctioning, setIsAuctioning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [biddingLog, setBiddingLog] = useState<string[]>([]);
    const [auctionFinished, setAuctionFinished] = useState(false);
    const [currentLotBids, setCurrentLotBids] = useState<{teamName: string, bid: number}[]>([]);
    const [countdown, setCountdown] = useState<number>(3);

    const currentPlayer = sortedPool[currentPlayerIdx] || null;
    const userTeam = teams.find(t => t.id === gameData.userTeamId);

    const canBid = useMemo(() => {
        if (!userTeam || !isAuctioning || !currentPlayer) return false;
        if (highestBidderId === userTeam.id) return false;
        if (userTeam.squad.length >= 18) return false;
        if (currentPlayer.isForeign && userTeam.squad.filter(p => p.isForeign).length >= MAX_FOREIGN_LIMIT) return false;
        
        const increment = getBidIncrement(currentBid);
        const nextBid = Number((currentBid + increment).toFixed(2));
        if (userTeam.purse < nextBid) return false;

        return true;
    }, [userTeam, isAuctioning, currentPlayer, highestBidderId, currentBid]);

    const getBidButtonLabel = () => {
        if (!userTeam || !currentPlayer) return "Loading...";
        if (highestBidderId === userTeam.id) return "Leading Bidder";
        if (userTeam.squad.length >= 18) return "Squad Full (Max 18)";
        if (currentPlayer.isForeign && userTeam.squad.filter(p => p.isForeign).length >= MAX_FOREIGN_LIMIT) return "Foreign Limit Reached (Max 5)";
        
        const increment = getBidIncrement(currentBid);
        const nextBid = Number((currentBid + increment).toFixed(2));
        if (userTeam.purse < nextBid) return `Insufficient Purse (Needs ${nextBid.toFixed(1)} Cr)`;
        
        return `Place Bid (${nextBid.toFixed(2)} Cr)`;
    };

    const getBasePrice = (player: Player) => {
        const rating = Math.max(player.battingSkill, player.secondarySkill);
        const isAllRounderOrBowler = [PlayerRole.ALL_ROUNDER, PlayerRole.SPIN_BOWLER, PlayerRole.FAST_BOWLER].includes(player.role);
        
        if (rating >= 80) return isAllRounderOrBowler ? 3.0 : 2.0;
        if (rating >= 70) return isAllRounderOrBowler ? 2.0 : 1.5;
        if (rating >= 60) return isAllRounderOrBowler ? 1.0 : 0.7;
        
        return 0.4; // 30 to 40 lac
    };

    const getPlayerValuation = useCallback((player: Player, team: Team) => {
        const rating = [PlayerRole.BATSMAN, PlayerRole.WICKET_KEEPER].includes(player.role)
            ? player.battingSkill
            : player.role === PlayerRole.ALL_ROUNDER
            ? (player.battingSkill + player.secondarySkill) / 2 + 10
            : player.secondarySkill;

        const totalMatches = Object.values(player.stats).reduce((acc: number, s: any) => acc + (s.matches || 0), 0);
        const experienceMult = (player.age >= 28 || totalMatches >= 50) ? 1.6 : 1.1;
        
        // Elite players are worth significantly more
        const skillFactor = Math.pow(rating / 50, 4.5);
        const baseValuation = (skillFactor * 2.5) * experienceMult;

        // Needs factor
        const squad = team.squad || [];
        const roleCount = squad.filter(p => p.role === player.role).length;
        let targetCount = 3;
        if (player.role === PlayerRole.BATSMAN) targetCount = TARGET_BATTERS;
        if (player.role === PlayerRole.WICKET_KEEPER) targetCount = TARGET_KEEPERS;
        if (player.role === PlayerRole.ALL_ROUNDER) targetCount = TARGET_ALL_ROUNDERS;
        if (player.role === PlayerRole.SPIN_BOWLER) targetCount = TARGET_SPINNERS;
        if (player.role === PlayerRole.FAST_BOWLER) targetCount = TARGET_FAST;

        let needFactor = 1.0;
        if (roleCount >= targetCount + 2) {
            needFactor = 0.5;
        } else if (roleCount < targetCount / 2) {
            needFactor = 1.6;
        }

        // Foreign player limit
        if (player.isForeign) {
            const foreignCount = squad.filter(p => p.isForeign).length;
            if (foreignCount >= MAX_FOREIGN_LIMIT) {
                return 0; // Absolute block
            } else if (foreignCount === MAX_FOREIGN_LIMIT - 1) {
                needFactor *= 0.5; // Reluctance
            }
        }

        const personalityJitter = 0.8 + (Math.random() * 0.5);
        return baseValuation * needFactor * personalityJitter;
    }, []);

    const getBidIncrement = (current: number) => {
        if (current < 2.0) return 0.2;
        if (current < 5.0) return 0.5;
        if (current < 10.0) return 1.0;
        return 2.0;
    };

    const startNextPlayer = useCallback(() => {
        if (auctionFinished || isProcessing) return;

        if (currentPlayerIdx >= sortedPool.length) {
            setAuctionFinished(true);
            return;
        }

        const player = sortedPool[currentPlayerIdx];
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
        setBiddingLog(prev => [`Lot #${currentPlayerIdx + 1}: ${player.name} (${getRoleFullName(player.role)}) up for ${bp.toFixed(2)} Cr`, ...prev.slice(0, 5)]);
    }, [currentPlayerIdx, sortedPool, auctionFinished, isProcessing]);

    const handleUserBid = () => {
        if (!userTeam || !isAuctioning || !currentPlayer) return;
        
        if (currentPlayer.isForeign && userTeam.squad.filter(p => p.isForeign).length >= MAX_FOREIGN_LIMIT) {
            setBiddingLog(prev => [`Foreign limit reached!`, ...prev.slice(0, 5)]);
            return;
        }

        const increment = getBidIncrement(currentBid);
        const nextBid = Number((currentBid + increment).toFixed(2));
        if (userTeam.purse < nextBid) return;
        
        setCurrentBid(nextBid);
        setHighestBidderId(userTeam.id);
        setCurrentLotBids(prev => [{teamName: userTeam.name, bid: nextBid}, ...prev]);
        setCountdown(3);
        setBiddingLog(prev => [`${userTeam.name} bids ${nextBid.toFixed(2)} Cr! (+${increment.toFixed(1)})`, ...prev.slice(0, 5)]);
    };

    const skipPlayer = () => {
        if (!currentPlayer || !isAuctioning || isProcessing) return;
        setIsAuctioning(false);
        setIsProcessing(true);

        const bp = getBasePrice(currentPlayer);
        const eligibleTeams = teams.filter(t => 
            mainTeamIds.includes(t.id) &&
            t.id !== gameData.userTeamId &&
            t.purse >= (bp + 0.2) &&
            t.squad.length < 18 &&
            (!currentPlayer.isForeign || t.squad.filter(p => p.isForeign).length < MAX_FOREIGN_LIMIT)
        );

        if (eligibleTeams.length > 0) {
            // AI evaluation for the skipped player using unified valuation
            const biddingTeams = eligibleTeams.filter(t => {
                const valuation = getPlayerValuation(currentPlayer, t);
                return (bp + 0.2) <= valuation;
            });

            const winnersPool = biddingTeams.length > 0 ? biddingTeams : eligibleTeams;
            const winner = winnersPool[Math.floor(Math.random() * winnersPool.length)];
            const finalPrice = Number((bp + (Math.random() * 0.4)).toFixed(2));
            
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) {
                    return { ...t, purse: Number((t.purse - finalPrice).toFixed(2)), squad: [...t.squad, currentPlayer] };
                }
                return t;
            }));
            setBiddingLog(prev => [`SOLD: ${winner.name} bought ${currentPlayer.name} for ${finalPrice.toFixed(2)} Cr`, ...prev.slice(0, 30)]);
            setHighestBidderId(winner.id);
            setCurrentBid(finalPrice);
        } else {
            setBiddingLog(prev => [`UNSOLD: ${currentPlayer.name} found no takers`, ...prev.slice(0, 30)]);
        }
        
        setTimeout(() => {
            setCurrentPlayerIdx(prev => prev + 1);
            setIsProcessing(false);
        }, 1200); 
    };

    const autoAuctionRemaining = () => {
        setIsAuctioning(false);
        setAuctionFinished(true);
    };

    useEffect(() => {
        if (!isAuctioning || !currentPlayer || auctionFinished) return;

        const timer = setTimeout(() => {
            const increment = getBidIncrement(currentBid);
            const eligibleTeams = teams.filter(t => 
                mainTeamIds.includes(t.id) &&
                t.id !== highestBidderId && 
                t.purse >= (currentBid + increment) &&
                t.squad.length < 18 &&
                (!currentPlayer.isForeign || t.squad.filter(p => p.isForeign).length < MAX_FOREIGN_LIMIT)
            );

            if (eligibleTeams.length > 0) {
                const biddingTeam = eligibleTeams.find(t => {
                    if (t.id === gameData.userTeamId) return false;
                    const finalValuation = getPlayerValuation(currentPlayer, t);
                    return (currentBid + increment) <= finalValuation;
                });

                if (biddingTeam) {
                    const nextBid = Number((currentBid + increment).toFixed(2));
                    setCurrentBid(nextBid);
                    setHighestBidderId(biddingTeam.id);
                    setCurrentLotBids(prev => [{teamName: biddingTeam.name, bid: nextBid}, ...prev]);
                    setCountdown(3);
                    setBiddingLog(prev => [`${biddingTeam.name} bids ${nextBid.toFixed(2)} Cr!`, ...prev.slice(0, 5)]);
                } else {
                    if (countdown === 3) {
                        setCountdown(2);
                        setBiddingLog(prev => [`Going once at ${currentBid.toFixed(2)} Cr...`, ...prev.slice(0, 5)]);
                    } else if (countdown === 2) {
                        setCountdown(1);
                        setBiddingLog(prev => [`Going twice at ${currentBid.toFixed(2)} Cr...`, ...prev.slice(0, 5)]);
                    } else if (countdown === 1) {
                        if (highestBidderId) {
                            sellPlayer();
                        } else {
                            unsoldPlayer();
                        }
                    }
                }
            } else {
                if (countdown === 3) {
                    setCountdown(2);
                    setBiddingLog(prev => [`Going once at ${currentBid.toFixed(2)} Cr...`, ...prev.slice(0, 5)]);
                } else if (countdown === 2) {
                    setCountdown(1);
                    setBiddingLog(prev => [`Going twice at ${currentBid.toFixed(2)} Cr...`, ...prev.slice(0, 5)]);
                } else if (countdown === 1) {
                    if (highestBidderId) {
                        sellPlayer();
                    } else {
                        unsoldPlayer();
                    }
                }
            }
        }, 1200 + Math.random() * 800);

        return () => clearTimeout(timer);
    }, [isAuctioning, currentBid, highestBidderId, currentPlayer, gameData.userTeamId, mainTeamIds, teams, countdown, getPlayerValuation]);

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
            setBiddingLog(prev => [`SOLD! ${currentPlayer.name} to ${winner.name}`, ...prev.slice(0, 5)]);
        }
        setTimeout(() => {
            setCurrentPlayerIdx(prev => prev + 1);
            setIsProcessing(false);
        }, 1500); // Increased from 800ms
    };

    const unsoldPlayer = () => {
        setIsAuctioning(false);
        setIsProcessing(true);
        setBiddingLog(prev => [`UNSOLD: ${currentPlayer.name}`, ...prev.slice(0, 5)]);
        setTimeout(() => {
            setCurrentPlayerIdx(prev => prev + 1);
            setIsProcessing(false);
        }, 1500); // Increased from 1000ms
    };

    useEffect(() => {
        if (!isAuctioning && !auctionFinished && !isProcessing) {
            startNextPlayer();
        }
    }, [currentPlayerIdx, sortedPool, isAuctioning, auctionFinished, isProcessing, startNextPlayer]);

    const finishAuction = () => {
        const soldPlayerIds = new Set(teams.flatMap(t => t.squad.map(p => p.id)));
        const unauctioned = gameData.allPlayers.filter(p => !soldPlayerIds.has(p.id));
        // Shuffle the pool for true randomness in AI squads
        let pool = shuffle([...unauctioned]);

        const finalTeams = teams.map(team => {
            const isDev = gameData.allTeamsData.find(td => td.id === team.id)?.isYouthTeam;
            const targetTotalSize = isDev ? 14 : 18;
            
            let squad = [...team.squad];
            let purse = team.purse;

            const fillNeeded = (role: PlayerRole, count: number, foreignOk: boolean = true) => {
                let existing = squad.filter(p => p.role === role).length;
                while (existing < count && pool.length > 0) {
                    const choices = pool.filter(p => p.role === role && (foreignOk || !p.isForeign)).slice(0, 10);
                    if (choices.length > 0) {
                        // Sort by skill to pick better players during auto-draft
                        choices.sort((a, b) => Math.max(b.battingSkill, b.secondarySkill) - Math.max(a.battingSkill, a.secondarySkill));
                        const p = choices[0];
                        const poolIdx = pool.findIndex(pl => pl.id === p.id);
                        pool.splice(poolIdx, 1);
                        squad.push(p);
                        existing++;
                        if (!isDev) purse = Math.max(0, purse - 0.2);
                    } else break;
                }
            };

            if (squad.length < targetTotalSize) {
                fillNeeded(PlayerRole.WICKET_KEEPER, TARGET_KEEPERS);
                fillNeeded(PlayerRole.ALL_ROUNDER, TARGET_ALL_ROUNDERS);
                fillNeeded(PlayerRole.SPIN_BOWLER, 2);
                fillNeeded(PlayerRole.FAST_BOWLER, 3);
            }

            // Final fill to squad size
            while (squad.length < targetTotalSize && pool.length > 0) {
                const choices = pool.slice(0, 10);
                // Sort by skill to pick better players during final auto-draft fill
                choices.sort((a, b) => Math.max(b.battingSkill, b.secondarySkill) - Math.max(a.battingSkill, a.secondarySkill));
                const p = choices[0];
                const poolIdx = pool.findIndex(pl => pl.id === p.id);
                pool.splice(poolIdx, 1);
                squad.push(p);
                if (!isDev) purse = Math.max(0, purse - 0.2);
            }

            return { ...team, squad, purse };
        });

        onAuctionComplete(finalTeams);
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] text-white font-sans overflow-hidden relative">
            {activeOverlay === 'franchises' && (
                <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                        <h2 className="text-xl font-black italic tracking-tighter uppercase">ROSTERS</h2>
                        <button onClick={() => setActiveOverlay('none')} className="bg-slate-800 p-2 rounded-full"><Icons.X /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-6">
                        {teams.map(team => {
                            const td = gameData.allTeamsData.find(d => d.id === team.id);
                            const isDev = td?.isYouthTeam;
                            return (
                                <div key={team.id} className={`p-4 rounded-2xl border ${team.id === gameData.userTeamId ? 'bg-slate-900 border-teal-500 shadow-lg' : 'bg-slate-900/40 border-slate-800'}`}>
                                    <div className="flex justify-between mb-3 border-b border-white/5 pb-2">
                                        <div>
                                            <h4 className="font-black uppercase tracking-tighter text-sm">{team.name} {isDev ? '(Dev)' : ''}</h4>
                                            <p className="text-[10px] text-zinc-500">{team.squad.length} / {isDev ? 14 : 18} signed</p>
                                        </div>
                                        <span className="text-sm font-black text-teal-400">{team.purse.toFixed(2)} Cr</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {team.squad.slice(0, 6).map(p => (
                                            <div key={p.id} className="flex justify-between text-[10px]">
                                                <span className="truncate max-w-[80px]">{p.name}</span>
                                                <span className={`${getRoleColor(p.role)} font-bold`}>{p.role}</span>
                                            </div>
                                        ))}
                                        {team.squad.length > 6 && <p className="text-[10px] text-zinc-600 col-span-2">+{team.squad.length - 6} more...</p>}
                                        {team.squad.length === 0 && <p className="text-[10px] text-zinc-600 italic col-span-2">No signings yet...</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="bg-[#0f172a] p-4 pt-10 border-b border-slate-800 flex flex-col gap-2 shadow-2xl z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-500 text-black px-2 py-0.5 rounded font-black text-xs skew-x-[-12deg]">LIVE AUCTION</div>
                        <h1 className="text-sm font-black text-slate-300 tracking-tight uppercase">Session 1</h1>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-black text-teal-400">{userTeam?.purse?.toFixed(2) || '0.00'} Cr</span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">Your Purse</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                {!auctionFinished ? (
                    <>
                        {currentPlayer ? (
                            <div className="bg-slate-900/80 rounded-[2rem] border border-slate-800 shadow-2xl p-6 relative flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRoleColor(currentPlayer.role)} bg-opacity-20 border border-current`}>
                                        {getRoleFullName(currentPlayer.role)} {currentPlayer.isForeign ? '✈️' : ''}
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Live Lot
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-bold uppercase">Rank #{currentPlayerIdx + 1}</div>
                                </div>

                                <div className="text-center mb-6">
                                    <h2 className="text-4xl font-black italic uppercase tracking-tighter break-words leading-none mb-1">
                                        {currentPlayer.name}
                                    </h2>
                                    
                                    <p className="text-[10px] text-teal-400/80 uppercase font-black tracking-widest mb-3">
                                        {currentPlayer.nationality === 'Local' ? '🇵🇰 Pakistan Local' : `🌍 ${currentPlayer.nationality} Flag`}
                                    </p>

                                    {currentPlayer.traits && currentPlayer.traits.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-1.5 mb-4 max-w-xs mx-auto">
                                            {currentPlayer.traits.map((t, idx) => (
                                                <span key={idx} className="bg-slate-800/80 text-amber-400 border border-amber-500/15 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm">
                                                    ⚡ {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-center gap-8 bg-black/20 py-2 rounded-xl border border-white/5 max-w-xs mx-auto">
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Batting</div>
                                            <div className="text-xl font-black text-blue-400">{currentPlayer.battingSkill}</div>
                                        </div>
                                        <div className="text-center border-l border-white/10 pl-8">
                                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Bowling</div>
                                            <div className="text-xl font-black text-red-400">{currentPlayer.secondarySkill}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/40 rounded-2xl p-4 mb-4 text-center border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">CURRENT BID</span>
                                    <div className="text-6xl font-black text-yellow-400 tabular-nums tracking-tighter">
                                        {currentBid.toFixed(2)} <span className="text-2xl ml-[-10px]">Cr</span>
                                    </div>
                                    <div className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                                        {highestBidderId ? `Leading: ${teams.find(t => t.id === highestBidderId)?.name}` : 'Awaiting Bids'}
                                    </div>
                                </div>

                                {/* Bidding History for current lot */}
                                <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
                                    {currentLotBids.length > 0 ? (
                                        currentLotBids.slice(0, 5).map((bid, idx) => (
                                            <div key={idx} className={`flex justify-between items-center p-2 rounded-lg text-[10px] border ${idx === 0 ? 'bg-teal-500/10 border-teal-500/30' : 'bg-slate-800/40 border-slate-700/50 opacity-60'}`}>
                                                <span className="font-bold uppercase tracking-tight">{bid.teamName}</span>
                                                <span className="font-black text-teal-400">{bid.bid.toFixed(2)} Cr</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-600 text-[10px] uppercase font-bold tracking-widest italic">
                                            No bids yet
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => handleUserBid()}
                                        disabled={!canBid}
                                        className={`w-full py-5 rounded-2xl font-black text-2xl italic uppercase tracking-tighter shadow-2xl transition-all transform active:scale-95 ${
                                            highestBidderId === userTeam?.id 
                                            ? 'bg-emerald-950/20 border-2 border-emerald-500 text-emerald-400' 
                                            : !canBid
                                            ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                                            : 'bg-teal-500 hover:bg-teal-400 text-black'
                                        }`}
                                    >
                                        {getBidButtonLabel()}
                                    </button>
                                    
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button onClick={skipPlayer} className="bg-slate-900/60 hover:bg-slate-700 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">Pass / Skip</button>
                                        <button onClick={autoAuctionRemaining} className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 py-4 rounded-2xl text-[10px] font-black text-red-300 uppercase tracking-widest">Random Auto-Draft</button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-auto pt-6 flex flex-col gap-4">
                            <button onClick={() => setActiveOverlay('franchises')} className="w-full bg-slate-800 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <Icons.Podium /> All Team Rosters
                            </button>
                            
                            <div className="bg-black p-4 rounded-2xl h-28 overflow-y-auto border border-white/5 font-mono text-[10px]">
                                <div className="text-slate-600 mb-2 border-b border-white/10 pb-1 uppercase tracking-widest">Live Feed</div>
                                {biddingLog.map((log, i) => (
                                    <div key={i} className={`mb-1 ${i === 0 ? 'text-teal-400 font-bold' : 'text-slate-500'}`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                        <div className="text-8xl mb-8">🏏</div>
                        <h2 className="text-4xl font-black italic tracking-tighter leading-none mb-4 uppercase text-teal-400">DRAFT FINALIZED</h2>
                        <p className="text-slate-400 mb-12 text-sm px-6">Every squad is now filled. Your development teams have been capped at 14 players. Match 1 is ready.</p>
                        <button onClick={finishAuction} className="w-full bg-teal-500 py-6 rounded-[2rem] text-xl font-black italic tracking-tighter uppercase shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:bg-teal-400 transition-colors">
                            Enter Career
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuctionRoom;