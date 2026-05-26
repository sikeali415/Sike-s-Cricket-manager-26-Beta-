
import React from 'react';
import { LiveMatchState, GameData, Player, BowlingSubType, Strategy } from '../types';
import { Icons } from './Icons';
import { getPlayerById } from '../utils';

interface GameplanViewProps {
    state: LiveMatchState;
    gameData: GameData;
    onToggleExploit: (val: boolean) => void;
    onSetBattingStrategy: (playerId: string, s: Strategy) => void;
}

const bowlingTypeLabels: Record<BowlingSubType, string> = {
    'ls': 'Leg Spin',
    'os': 'Off Spin',
    'lals': 'Left Arm Leg Spin',
    'laos': 'Left Arm Off Spin',
    'lac': 'Chinaman',
    'mv': 'Medium Variant',
    'fb': 'Fast Baller',
    'fbs': 'Fast Control',
    'm': 'Medium',
    'none': 'Standard'
};

const AggressionToggle = ({ value, onChange }: { value: Strategy, onChange: (s: Strategy) => void }) => {
    const options: { id: Strategy, label: string, icon: string, color: string }[] = [
        { id: 'defensive', label: '🛡️', icon: 'Shield', color: 'blue' },
        { id: 'balanced', label: '⚖️', icon: 'Scale', color: 'yellow' },
        { id: 'attacking', label: '⚡', icon: 'Zap', color: 'red' },
        { id: 'blitzkrieg', label: '🔥', icon: 'Flame', color: 'orange' },
    ];

    return (
        <div className="flex bg-slate-900/80 rounded-lg p-1 gap-1 border border-slate-700/50">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`flex-1 py-2 px-1 rounded-md text-xs transition-all duration-200 border flex flex-col items-center gap-1 ${
                        value === opt.id 
                        ? `bg-${opt.color}-600/20 border-${opt.color}-500/50 text-${opt.color}-400 shadow-[0_0_10px_rgba(0,0,0,0.3)]` 
                        : 'border-transparent text-slate-500 hover:bg-slate-800'
                    }`}
                >
                    <span className="text-sm">{opt.label}</span>
                    <span className="text-[8px] uppercase font-black tracking-tighter">{opt.id.slice(0, 4)}</span>
                </button>
            ))}
        </div>
    );
};

export const GameplanView: React.FC<GameplanViewProps> = ({ state, gameData, onToggleExploit, onSetBattingStrategy }) => {
    const { currentBatters, currentBowlerId, isExploitingWeakness, strategies } = state;
    const striker = getPlayerById(currentBatters.strikerId, gameData.allPlayers);
    const nonStriker = getPlayerById(currentBatters.nonStrikerId, gameData.allPlayers);
    const bowler = getPlayerById(currentBowlerId, gameData.allPlayers);

    const isMatch = (p: Player) => p.weaknesses?.includes(bowler.bowlingSubType!) || false;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header / Strategy Toggle */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Icons.Target className="text-red-500" /> TACTICAL HUB
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Real-time Gameplan HUD</p>
                </div>
                <div className="flex flex-col items-end">
                    <button 
                        onClick={() => onToggleExploit(!isExploitingWeakness)}
                        className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-tighter transition-all shadow-lg ${isExploitingWeakness ? 'bg-red-600 text-white shadow-red-500/20' : 'bg-slate-700 text-slate-400 opacity-60'}`}
                    >
                        {isExploitingWeakness ? 'Exploiting Weakness' : 'Focus Neutral'}
                    </button>
                    <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Action: +10% Wicket Potential</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Batters Weaknesses & Aggression */}
                <div className="space-y-4">
                    <h4 className="text-[10px] text-slate-500 uppercase font-black border-l-2 border-yellow-500 pl-2">Batting Control</h4>
                    
                    {[striker, nonStriker].map((p, i) => (
                        <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-white font-bold text-base flex items-center gap-2">
                                        {p.name} {i === 0 ? <span className="text-[10px] bg-teal-500 text-white px-1 rounded uppercase">STRIKER</span> : ''}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase">{p.role}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Batting Skill</p>
                                    <p className="text-xl font-black text-yellow-500">{p.battingSkill}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Aggression HUD</p>
                                    <AggressionToggle 
                                        value={strategies.batting[p.id] || 'balanced'} 
                                        onChange={(s) => onSetBattingStrategy(p.id, s)} 
                                    />
                                </div>

                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-2">Vulnerabilities</p>
                                    <div className="flex flex-wrap gap-2">
                                        {p.weaknesses && p.weaknesses.length > 0 ? (
                                            p.weaknesses.map(w => (
                                                <span key={w} className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${bowler.bowlingSubType === w ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                                                    ⚠️ {bowlingTypeLabels[w] || w}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-slate-600 italic">No identified structural weaknesses</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {isMatch(p) && (
                                <div className="absolute top-0 right-0 p-1 pointer-events-none">
                                    <div className="bg-red-500 text-[8px] font-black uppercase text-white px-2 py-0.5 rounded-bl-lg">CRITICAL MATCHUP</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Right Column: Bowler Capabilities */}
                <div className="space-y-4">
                    <h4 className="text-[10px] text-slate-500 uppercase font-black border-l-2 border-cyan-500 pl-2">Bowling Profile</h4>
                    
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <Icons.Zap />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">{bowler.name}</p>
                                <p className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest">{bowlingTypeLabels[bowler.bowlingSubType!] || bowler.role}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Speed / Control</span>
                                    <span className="text-xs font-mono text-cyan-400">{bowler.secondarySkill}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500" style={{ width: `${bowler.secondarySkill}%` }}></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800 text-center">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Primary</p>
                                    <p className="text-white text-xs font-bold truncate">{bowlingTypeLabels[bowler.bowlingSubType!] || 'Standard'}</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800 text-center">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Variation</p>
                                    <p className="text-white text-xs font-bold truncate">{bowler.secondarySkill > 70 ? 'High' : 'Medium'}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                <p className="text-[10px] text-cyan-400 uppercase font-black mb-1">Tactical Analysis</p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    {isMatch 
                                        ? "CRITICAL MATCHUP: Current bowler's trajectory directly exploits the active batsman's identified structural vulnerability. Recommend high pressure."
                                        : "Bowler is providing standard variation. No direct weakness correlation found with current strike pair."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Captaincy Action Panel */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h4 className="text-[10px] text-slate-500 uppercase font-black mb-4">Captaincy Directive</h4>
                <div className="flex gap-4">
                    <button 
                        onClick={() => onToggleExploit(true)}
                        disabled={isExploitingWeakness}
                        className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${isExploitingWeakness ? 'bg-red-500/10 border-red-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                        <Icons.Sword className={isExploitingWeakness ? 'text-red-500' : 'text-slate-500'} />
                        <span className={`text-[10px] font-bold uppercase ${isExploitingWeakness ? 'text-red-500' : 'text-slate-400'}`}>Full Aggression</span>
                    </button>
                    <button 
                        onClick={() => onToggleExploit(false)}
                        disabled={!isExploitingWeakness}
                        className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${!isExploitingWeakness ? 'bg-cyan-500/10 border-cyan-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                        <Icons.Shield className={!isExploitingWeakness ? 'text-cyan-500' : 'text-slate-500'} />
                        <span className={`text-[10px] font-bold uppercase ${!isExploitingWeakness ? 'text-cyan-500' : 'text-slate-400'}`}>Hold Line</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
