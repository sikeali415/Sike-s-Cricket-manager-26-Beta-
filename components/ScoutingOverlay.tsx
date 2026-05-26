
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Zap, Target, Info, Activity, ShieldCheck } from 'lucide-react';
import { Player, Strategy, BowlingPerformance, BattingPerformance } from '../types';
import { getPlayerById } from '../utils';

interface ScoutingOverlayProps {
    player: Player;
    onClose: () => void;
    currentBowlingPerf?: BowlingPerformance;
    currentBattingPerf?: BattingPerformance;
    isBattingMode: boolean; // Is the user currently batting (viewing opponent bowler)?
    onPlaySafeToggle?: (batterId: string, bowlerId: string) => void;
    activeBatterId?: string;
    activeBowlerId?: string;
    isPlayingSafe?: boolean;
}

export const ScoutingOverlay: React.FC<ScoutingOverlayProps> = ({ 
    player, 
    onClose, 
    currentBowlingPerf, 
    currentBattingPerf,
    isBattingMode,
    onPlaySafeToggle,
    activeBatterId,
    activeBowlerId,
    isPlayingSafe
}) => {
    // Determine title and color based on role
    const isBowler = player.role === 'BL' || player.role === 'SB';
    const accentColor = isBowler ? 'text-cyan-400' : 'text-teal-400';
    const bgColor = isBowler ? 'border-cyan-500/50' : 'border-teal-500/50';

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[150] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={`w-full max-w-sm bg-slate-900 border-2 ${bgColor} rounded-3xl overflow-hidden shadow-2xl`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-6 pb-4">
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                    >
                        <X size={18} className="text-slate-400" />
                    </button>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl mb-3 shadow-inner`}>
                            {isBowler ? '⚾' : '🏏'}
                        </div>
                        <h2 className="text-2xl font-black text-white italic lowercase tracking-tight">
                            {player.name}
                        </h2>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 h-5 flex items-center px-2 rounded-md border border-slate-700">
                                {player.role}
                            </span>
                            {player.isPowerHitter && (
                                <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 h-5 flex items-center px-2 rounded-md border border-orange-500/30">
                                    Power Hitter
                                </span>
                            )}
                            {player.isFinisher && (
                                <span className="text-[10px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-400 h-5 flex items-center px-2 rounded-md border border-purple-500/30">
                                    Finisher
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-0 space-y-4">
                    {/* Scouting Details */}
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-4">
                        {isBowler ? (
                            <>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity size={14} className="text-cyan-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bowler Intel</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] text-slate-500 uppercase font-bold">Type</p>
                                            <p className="text-sm font-bold text-white uppercase">{player.bowlingSubType || 'Medium'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 uppercase font-bold">Acc/Control</p>
                                            <p className="text-sm font-bold text-white uppercase">{player.secondarySkill}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap size={14} className="text-orange-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Threat Profile</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed italic">
                                        "{player.name} is particularly dangerous with the new ball. Struggles against set batsmen."
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={14} className="text-teal-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batting Scout</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Main Strength</p>
                                            <p className="text-xs font-bold text-teal-400">{player.style === 'A' ? 'Aggressive Pull' : 'Steady Anchor'}</p>
                                        </div>
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                            <p className="text-[8px] text-red-500/70 uppercase font-bold mb-1">Fatal Weakness</p>
                                            <p className="text-xs font-bold text-red-400">{player.weaknesses?.[0]?.toUpperCase() || 'EXPRESS PACE'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tactical Note</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed italic">
                                        "Loves playing on the leg side. Starve him of room outside off to build pressure."
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Stats Summary */}
                    <div className="flex gap-4 px-2">
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Match R/W</p>
                            <p className="text-xl font-black text-white">
                                {isBowler 
                                    ? `${currentBowlingPerf?.wickets || 0}W` 
                                    : `${currentBattingPerf?.runs || 0}R`}
                            </p>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{isBowler ? 'Econ' : 'Balls'}</p>
                            <p className="text-xl font-black text-white">
                                {isBowler 
                                    ? currentBowlingPerf?.overs || '0.0'
                                    : currentBattingPerf?.balls || 0}
                            </p>
                        </div>
                    </div>

                    {/* Play Safe Action (Only if user is batting and looking at opponent bowler) */}
                    {isBattingMode && isBowler && onPlaySafeToggle && activeBatterId && activeBowlerId && (
                        <div className="pt-2">
                            <button 
                                onClick={() => onPlaySafeToggle(activeBatterId, activeBowlerId)}
                                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all ${
                                    isPlayingSafe 
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xl shadow-teal-500/10'
                                }`}
                            >
                                {isPlayingSafe ? <ShieldCheck size={20} /> : <Shield size={20} />}
                                {isPlayingSafe ? 'PLAYING SAFE ON' : 'PLAY SAFE AGAINST THIS SPELL'}
                            </button>
                            <p className="text-[9px] text-slate-500 text-center mt-2 uppercase tracking-wide">
                                Lowers dismissal risk significantly but limits scoring
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="bg-slate-800 p-4 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                        <Info size={10} className="inline mr-1 mb-0.5" />
                        Scouting data updated based on current tourney form
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};
