
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Match, GameData, MatchResult, Strategy, LiveMatchState, Player, Ground, Message } from '../types';
import { useLiveMatch } from '../hooks/useLiveMatch';
import { Icons } from './Icons';
import { ScoutingOverlay } from './ScoutingOverlay';
import { TV_CHANNELS, INITIAL_SPONSORSHIPS, TOURNAMENT_LOGOS } from '../data';
import { getPlayerById } from '../utils';
import { streamAssistantResponse } from '../geminiService';
import { GameplanView } from './GameplanView';

interface LiveMatchScreenProps {
    match: Match;
    gameData: GameData;
    onMatchComplete: (result: MatchResult) => void;
    onExit: (stateToSave?: LiveMatchState) => void;
    savedState?: LiveMatchState | null;
}

const StrategyToggle = ({ label, value, onChange }: { label: string, value: Strategy, onChange: (s: Strategy) => void }) => (
    <div className="flex flex-col items-center bg-slate-800 rounded p-1 flex-1">
        <span className="text-[9px] text-slate-400 uppercase mb-1">{label}</span>
        <div className="flex bg-slate-900 rounded p-0.5 w-full justify-center">
            {(['defensive', 'balanced', 'attacking', 'blitzkrieg'] as Strategy[]).map(s => (
                <button
                    key={s}
                    onClick={() => onChange(s)}
                    className={`px-2 py-1 text-[9px] uppercase font-bold rounded transition-colors flex-1 ${value === s 
                        ? s === 'attacking' ? 'bg-red-600 text-white' : s === 'defensive' ? 'bg-blue-600 text-white' : s === 'blitzkrieg' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white' 
                        : 'text-slate-500 hover:bg-slate-700'}`}
                >
                    {s === 'blitzkrieg' ? 'BLT' : s.slice(0,3)}
                </button>
            ))}
        </div>
    </div>
);

const PreMatchPanel = ({ match, gameData, onStart }: { match: Match, gameData: GameData, onStart: () => void }) => {
    const sponsorship = gameData.sponsorships?.[gameData.currentFormat] || INITIAL_SPONSORSHIPS[gameData.currentFormat];
    const teamA = gameData.teams.find(t => t.name === match.teamA);
    const teamB = gameData.teams.find(t => t.name === match.teamB);
    const ground = gameData.grounds.find(g => g.code === (gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround || 'KCG'));
    
    // Basic prediction logic
    const teamARank = gameData.standings[gameData.currentFormat].find(s => s.teamId === teamA?.id)?.points || 0;
    const teamBRank = gameData.standings[gameData.currentFormat].find(s => s.teamId === teamB?.id)?.points || 0;
    const winProbA = 50 + (teamARank - teamBRank) * 2;

    const getWeatherIcon = (w?: string) => {
        switch(w) {
            case 'Sunny': return '☀️';
            case 'Overcast': return '☁️';
            case 'Rainy': return '🌧️';
            case 'Humid': return '🌫️';
            default: return '🌤️';
        }
    };

    return (
        <div className="absolute inset-0 z-[120] bg-slate-900/95 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-fade-in">
            {/* Header */}
            <div className="w-full max-w-lg mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
                <div className={`w-12 h-12 ${sponsorship.logoColor}`} dangerouslySetInnerHTML={{__html: sponsorship.tournamentLogo || TOURNAMENT_LOGOS[0].svg}}></div>
                <div className="text-center">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{gameData.currentFormat}</h2>
                    <h1 className="text-2xl font-extrabold text-white italic">{sponsorship.sponsorName} {sponsorship.tournamentName}</h1>
                </div>
                <div className={`w-16 h-10 opacity-80`} dangerouslySetInnerHTML={{__html: sponsorship.tvLogo || ''}}></div>
            </div>

            {/* Match Card */}
            <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 bg-slate-800/50">
                    <div className="text-center w-1/3">
                        <div className="w-16 h-16 mx-auto mb-2" dangerouslySetInnerHTML={{__html: gameData.allTeamsData.find(t => t.id === teamA?.id)?.logo || ''}}></div>
                        <h3 className="font-bold text-xl text-white">{teamA?.name}</h3>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="text-2xl font-black text-teal-500">VS</div>
                        <div className="text-[10px] text-slate-400 uppercase mt-1">{ground?.name}</div>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="w-16 h-16 mx-auto mb-2" dangerouslySetInnerHTML={{__html: gameData.allTeamsData.find(t => t.id === teamB?.id)?.logo || ''}}></div>
                        <h3 className="font-bold text-xl text-white">{teamB?.name}</h3>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-px bg-slate-700 border-t border-slate-700">
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Pitch Report</p>
                        <p className="text-teal-400 font-semibold text-sm">{ground?.pitch}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Favors {ground?.pitch.includes('Spin') ? 'Spin' : ground?.pitch.includes('Green') ? 'Pace' : 'Batting'}</p>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Conditions</p>
                        <p className="text-white font-semibold text-sm flex items-center justify-center gap-2">
                            <span className="text-lg">{getWeatherIcon(ground?.weather)}</span> {ground?.weather || 'Clear'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">{ground?.outfieldSpeed || 'Medium'} Outfield</p>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Win Probability</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="h-2 w-16 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500" style={{width: `${Math.min(100, Math.max(0, winProbA))}%`}}></div>
                            </div>
                            <span className="text-xs font-bold text-white">{Math.round(Math.min(100, Math.max(0, winProbA)))}%</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Boundary Dimensions</p>
                        <p className="text-white font-semibold text-sm">{ground?.dimensions || '65m / 70m'}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{ground?.boundarySize || 'Medium'} Size</p>
                    </div>
                </div>
                
                <button onClick={onStart} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase tracking-wider transition-colors">
                    Start Match
                </button>
            </div>
        </div>
    );
};

const AutoArrivalNotification = ({ playerName, onOverride, secondsLeft }: { playerName: string, onOverride: () => void, secondsLeft: number }) => (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-teal-500/50 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-slide-up min-w-[300px]">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-900 flex items-center justify-center text-teal-400 animate-pulse">
            <Icons.User className="w-6 h-6" />
        </div>
        <div className="flex-grow">
            <p className="text-[10px] text-teal-400 uppercase font-bold">Next Batter Arriving</p>
            <p className="text-white font-bold text-lg">{playerName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-mono text-slate-400">{secondsLeft}s</span>
            <div className="text-[9px] text-gray-500 uppercase">Click to skip</div>
        </div>
    </div>
);

// Signify AI Chat Overlay
const SignifyChat = ({ gameData, onClose }: { gameData: GameData, onClose: () => void }) => {
    const [messages, setMessages] = useState<Message[]>([{ id: '1', text: "Signify Online. Analyzing real-time match data... How can I assist?", sender: 'bot' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        if (!input.trim()) return;
        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(p => [...p, userMsg]);
        setInput('');
        setIsTyping(true);
        try {
            const botId = (Date.now()+1).toString();
            setMessages(p => [...p, { id: botId, text: '', sender: 'bot' }]);
            const stream = streamAssistantResponse(userMsg.text, messages, gameData);
            let full = '';
            for await (const chunk of stream) {
                full += chunk;
                setMessages(p => p.map(m => m.id === botId ? { ...m, text: full } : m));
            }
        } catch {
            setMessages(p => [...p, { id: Date.now().toString(), text: "Signal lost.", sender: 'bot' }]);
        } finally { setIsTyping(false); }
    };

    return (
        <div className="absolute inset-0 bg-slate-900/95 z-[130] flex flex-col p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Icons.Bot />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Signify AI</h3>
                        <p className="text-[10px] text-cyan-400 uppercase tracking-wider">Real-Time Analyst</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><Icons.X /></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3 mb-4 pr-2">
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-cyan-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isTyping && <div className="text-xs text-cyan-500 animate-pulse">Analyzing...</div>}
                <div ref={endRef} />
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask for tactics..." className="flex-grow bg-slate-800 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
                <button onClick={send} className="bg-cyan-500 hover:bg-cyan-400 text-white p-2 rounded-full"><Icons.Play className="h-5 w-5" /></button>
            </div>
        </div>
    );
};

const PostTossInfoScreen = ({ state, gameData, onProceed }: { state: LiveMatchState, gameData: GameData, onProceed: () => void }) => {
    const teamA = state.innings[0].teamName === state.battingTeam.name ? state.battingTeam : state.bowlingTeam;
    const teamB = state.innings[0].teamName === state.battingTeam.name ? state.bowlingTeam : state.battingTeam;

    // H2H Logic
    const h2hRecord = gameData.records?.teamVsTeam.find(r => 
        (r.teamAId === teamA.id && r.teamBId === teamB.id) || 
        (r.teamAId === teamB.id && r.teamBId === teamA.id)
    );
    const matches = h2hRecord?.matches || 0;
    const winsA = h2hRecord ? (h2hRecord.teamAId === teamA.id ? h2hRecord.teamAWins : h2hRecord.matches - h2hRecord.teamAWins) : 0;
    const winsB = h2hRecord ? (h2hRecord.teamAId === teamB.id ? h2hRecord.teamAWins : h2hRecord.matches - h2hRecord.teamAWins) : 0;
    const noResult = 0; // Simplified

    // Last 5 Results (Mocked from recent match results if available, else just a random pattern for flavor)
    const recentResults = gameData.matchResults[gameData.currentFormat]
        .filter(r => (r.winnerId === teamA.id && (r.loserId === teamB.id)) || (r.winnerId === teamB.id && (r.loserId === teamA.id)))
        .slice(-5)
        .map(r => r.winnerId === teamA.id ? teamA.name.slice(0,3).toUpperCase() : teamB.name.slice(0,3).toUpperCase());
    
    // Fill with random if less than 5
    while(recentResults.length < 5) {
        recentResults.push(Math.random() > 0.5 ? teamA.name.slice(0,3).toUpperCase() : teamB.name.slice(0,3).toUpperCase());
    }

    const getInForm = (teamId: string) => {
        const team = gameData.teams.find(t => t.id === teamId);
        if (!team) return { batters: [], bowlers: [] };
        const format = gameData.currentFormat;
        const batters = [...team.squad]
            .filter(p => p.role === 'BT' || p.role === 'AR' || p.role === 'WK')
            .sort((a, b) => (b.stats[format]?.runs || 0) - (a.stats[format]?.runs || 0))
            .slice(0, 2);
        const bowlers = [...team.squad]
            .filter(p => p.role === 'BL' || p.role === 'SB' || p.role === 'AR')
            .sort((a, b) => (b.stats[format]?.wickets || 0) - (a.stats[format]?.wickets || 0))
            .slice(0, 2);
        return { batters, bowlers };
    };

    const inFormA = getInForm(teamA.id);
    const inFormB = getInForm(teamB.id);

    const getWatchPlayer = (teamId: string) => {
        const team = gameData.teams.find(t => t.id === teamId);
        return team?.squad.sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))[0];
    };

    const watchA = getWatchPlayer(teamA.id);
    const watchB = getWatchPlayer(teamB.id);

    return (
        <div className="absolute inset-0 z-[110] bg-slate-900 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-8 py-8">
                <div className="text-center">
                    <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-1">Match Information</h2>
                    <h1 className="text-3xl font-black text-white italic">PRE-MATCH SHOW</h1>
                </div>

                {/* H2H Section */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <h3 className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">HEAD TO HEAD</h3>
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-center w-1/3">
                            <h4 className="text-white font-bold text-lg">{teamA.name}</h4>
                            <p className="text-3xl font-black text-teal-400">{winsA}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Wins</p>
                        </div>
                        <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                            <p className="text-[10px] text-slate-400 uppercase">Total Matches</p>
                            <p className="text-xl font-bold text-white">{matches}</p>
                        </div>
                        <div className="text-center w-1/3">
                            <h4 className="text-white font-bold text-lg">{teamB.name}</h4>
                            <p className="text-3xl font-black text-white">{winsB}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Wins</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Last 5 Results</p>
                        <div className="flex gap-2">
                            {recentResults.reverse().map((res, i) => (
                                <div key={i} className={`flex-1 py-1 text-center font-bold text-xs rounded ${res === teamA.name.slice(0,3).toUpperCase() ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                    {res}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* In Form Section */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">IN-FORM PLAYERS</h3>
                        <span className="text-[9px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded border border-teal-500/30 font-bold">CURRENT SEASON</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-teal-400 font-bold mb-3 border-l-2 border-teal-500 pl-2 uppercase text-xs">{teamA.name}</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Batters</p>
                                    {inFormA.batters.map(p => {
                                        const h2h = gameData.records.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamB.id) || { runs: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.runs || 0}r</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-teal-400 font-black text-xs">{h2h.runs}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamB.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Bowlers</p>
                                    {inFormA.bowlers.map(p => {
                                        const h2h = gameData.records.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamB.id) || { wickets: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.wickets || 0}w</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-cyan-400 font-black text-xs">{h2h.wickets}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamB.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-3 border-l-2 border-slate-600 pl-2 uppercase text-xs">{teamB.name}</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Batters</p>
                                    {inFormB.batters.map(p => {
                                        const h2h = gameData.records.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamA.id) || { runs: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.runs || 0}r</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-teal-400 font-black text-xs">{h2h.runs}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamA.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Bowlers</p>
                                    {inFormB.bowlers.map(p => {
                                        const h2h = gameData.records.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamA.id) || { wickets: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.wickets || 0}w</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-cyan-400 font-black text-xs">{h2h.wickets}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamA.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Player to Watch & H2H Matchups */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">PLAYERS TO WATCH</h3>
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30 font-bold">VS OPPONENT H2H</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { player: watchA, team: teamA, vsTeam: teamB },
                            { player: watchB, team: teamB, vsTeam: teamA }
                        ].map((item, idx) => {
                            const vsStats = gameData.records?.playerVsTeam.find(r => r.playerId === item.player?.id && r.vsTeamId === item.vsTeam.id);
                            return (
                                <div key={idx} className={`bg-slate-900 p-4 rounded-lg flex flex-col border-t-4 ${idx === 0 ? 'border-teal-500' : 'border-slate-500'}`}>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{item.team.name}</p>
                                    <p className="text-lg font-black text-white italic">{item.player?.name} ⭐</p>
                                    <div className="mt-3 bg-slate-800/50 rounded p-2 border border-slate-700/50">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">H2H vs {item.vsTeam.name.slice(0,3)}</p>
                                        <div className="flex justify-between text-[11px]">
                                            {item.player?.role === 'BL' || item.player?.role === 'SB' ? (
                                                <>
                                                    <span className="text-slate-400">Wickets: <span className="text-yellow-400 font-bold">{vsStats?.wickets || 0}</span></span>
                                                    <span className="text-slate-400">Econ: <span className="text-teal-400 font-bold">{vsStats?.ballsBowled ? ((vsStats.runsConceded / vsStats.ballsBowled) * 6).toFixed(1) : '0.0'}</span></span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400">Runs: <span className="text-yellow-400 font-bold">{vsStats?.runs || 0}</span></span>
                                                    <span className="text-slate-400">Avg: <span className="text-teal-400 font-bold">{vsStats?.dismissals ? (vsStats.runs / vsStats.dismissals).toFixed(1) : (vsStats?.runs || '0.0')}</span></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button onClick={onProceed} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-teal-500/20 active:scale-[0.98]">
                    Continue to Match
                </button>
            </div>
        </div>
    );
};

const LiveMatchScreen: React.FC<LiveMatchScreenProps> = ({ match, gameData, onMatchComplete, onExit, savedState }) => {
    const { state, playBall, playOver, autoSimulate, simulateInning, simulateMatch, setBattingStrategy, setBowlingStrategy, toggleExploitWeakness, selectOpeners, selectNextBatter, selectNextBowler, startMatch, proceedToMatch, togglePlaySafe } = useLiveMatch(match, gameData, onMatchComplete, savedState);
    const commentaryRef = useRef<HTMLDivElement>(null);
    
    // Match Centre State
    const [showMatchCentre, setShowMatchCentre] = useState(false);
    const [showSignify, setShowSignify] = useState(false);
    const [activeTab, setActiveTab] = useState<'scorecard' | 'commentary' | 'analysis' | 'gameplan'>('scorecard');
    
    const [selectedOpener1, setSelectedOpener1] = useState('');
    const [selectedOpener2, setSelectedOpener2] = useState('');
    const [selectedBatter, setSelectedBatter] = useState('');
    const [selectedBowler, setSelectedBowler] = useState('');
    const [tossState, setTossState] = useState<'coin' | 'result'>('coin');
    const [showPreMatch, setShowPreMatch] = useState(false);
    const [scoutingPlayerId, setScoutingPlayerId] = useState<string | null>(null);

    const handlePlayerScouting = (playerId?: string) => {
        if (!playerId) return;
        setScoutingPlayerId(playerId);
    };

    // Memoized team details & preview statistics
    const teamA = useMemo(() => gameData.teams.find(t => t.name === match.teamA), [gameData.teams, match.teamA]);
    const teamB = useMemo(() => gameData.teams.find(t => t.name === match.teamB), [gameData.teams, match.teamB]);

    // Head-to-Head Records
    const h2h = useMemo(() => {
        if (!teamA || !teamB || !gameData.records?.teamVsTeam) return { matches: 0, winsA: 0, winsB: 0 };
        const record = gameData.records.teamVsTeam.find(r => 
            (r.teamAId === teamA.id && r.teamBId === teamB.id) || 
            (r.teamAId === teamB.id && r.teamBId === teamA.id)
        );
        if (record) {
            return {
                matches: record.matches,
                winsA: record.teamAId === teamA.id ? record.teamAWins : (record.matches - record.teamAWins),
                winsB: record.teamAId === teamB.id ? record.teamAWins : (record.matches - record.teamAWins),
            };
        }
        return { matches: 0, winsA: 0, winsB: 0 };
    }, [teamA, teamB, gameData.records?.teamVsTeam]);

    // In form players & players to watch
    const getInFormPlayers = useCallback((team: any) => {
        if (!team) return { batters: [], bowlers: [] };
        const batters = [...team.squad]
            .filter(p => p.role === 'BT' || p.role === 'AR' || p.role === 'WK')
            .sort((a, b) => {
                const runsA = a.stats[gameData.currentFormat]?.runs || 0;
                const runsB = b.stats[gameData.currentFormat]?.runs || 0;
                if (runsB !== runsA) return runsB - runsA;
                return b.battingSkill - a.battingSkill;
            })
            .slice(0, 2);

        const bowlers = [...team.squad]
            .filter(p => p.role === 'BL' || p.role === 'SB' || p.role === 'AR')
            .sort((a, b) => {
                const wicketsA = a.stats[gameData.currentFormat]?.wickets || 0;
                const wicketsB = b.stats[gameData.currentFormat]?.wickets || 0;
                if (wicketsB !== wicketsA) return wicketsB - wicketsA;
                return b.secondarySkill - a.secondarySkill;
            })
            .slice(0, 2);

        return { batters, bowlers };
    }, [gameData.currentFormat]);

    const getPlayerToWatch = useCallback((team: any) => {
        if (!team) return null;
        return [...team.squad].sort((a, b) => {
            const overallA = a.battingSkill + a.secondarySkill;
            const overallB = b.battingSkill + b.secondarySkill;
            return overallB - overallA;
        })[0];
    }, []);

    const inFormA = useMemo(() => getInFormPlayers(teamA), [teamA, getInFormPlayers]);
    const inFormB = useMemo(() => getInFormPlayers(teamB), [teamB, getInFormPlayers]);

    const watchA = useMemo(() => getPlayerToWatch(teamA), [teamA, getPlayerToWatch]);
    const watchB = useMemo(() => getPlayerToWatch(teamB), [teamB, getPlayerToWatch]);

    // Auto Arrival State
    const [autoArrivalSeconds, setAutoArrivalSeconds] = useState<number | null>(null);
    const autoArrivalTimerRef = useRef<any>(null);
    const [nextAutoPlayerId, setNextAutoPlayerId] = useState<string | null>(null);

    const sponsorship = gameData.sponsorships?.[gameData.currentFormat];
    const tvChannelData = TV_CHANNELS.find(t => t.name === sponsorship?.tvChannel);
    const tvLogo = sponsorship?.tvLogo;
    const tvColor = tvChannelData?.color || 'text-white';

    // Pre-match Panel Logic
    useEffect(() => {
        if (state?.status === 'ready' && !savedState) {
            setShowPreMatch(true);
        }
    }, [state?.status, savedState]);

    // Auto-select / Pre-fill logic AND Auto-Arrival
    useEffect(() => {
        if (!state) return;
        
        // Helper to find next player
        const getNextPlayer = () => {
            const currentInning = state.innings[state.currentInningIndex];
            if (state.waitingFor === 'batter') {
                return currentInning.batting.find(b => !b.isOut && b.playerId !== state.currentBatters.strikerId && b.playerId !== state.currentBatters.nonStrikerId);
            } else if (state.waitingFor === 'bowler') {
                const overLimit = gameData.currentFormat.includes('T20') ? 4 : 10;
                const validBowlers = currentInning.bowling.filter(b => b.playerId !== state.currentBowlerId && b.ballsBowled < overLimit * 6);
                return validBowlers[0];
            }
            return null;
        };

        if (state.waitingFor === 'openers') {
             const currentInning = state.innings[state.currentInningIndex];
             const available = currentInning.batting.filter(b => !b.isOut);
             if (available.length >= 2) {
                 setSelectedOpener1(available[0].playerId);
                 setSelectedOpener2(available[1].playerId);
             }
        } else if (state.waitingFor === 'batter' || state.waitingFor === 'bowler') {
            const nextP = getNextPlayer();
            if (nextP) {
                if (state.waitingFor === 'batter') {
                    if (!selectedBatter) setSelectedBatter(nextP.playerId);
                }
                if (state.waitingFor === 'bowler') {
                    if (!selectedBowler) setSelectedBowler(nextP.playerId);
                }
            }
        }
    }, [state?.waitingFor, state?.currentInningIndex, state?.innings, state?.currentBatters, state?.currentBowlerId, gameData.currentFormat]);

    const handleOverrideAuto = () => {
        // No-op or clean-up since countdown timer is removed
    };

    useEffect(() => {
        if (activeTab === 'commentary' && commentaryRef.current) {
            commentaryRef.current.scrollTop = 0;
        }
    }, [state?.commentary, activeTab]);

    // --- PREDICTIONS & STATS CALCULATIONS ---
    const predictions = useMemo(() => {
        if (!state) return null;
        const { innings, currentInningIndex, target, battingTeam, bowlingTeam, currentBatters } = state;
        const currentInning = innings[currentInningIndex];
        const maxOvers = gameData.currentFormat.includes('T20') ? 20 : 50;
        const ballsBowled = Math.floor(parseFloat(currentInning.overs)) * 6 + (parseFloat(currentInning.overs) % 1 * 10);
        const ballsRemaining = (maxOvers * 6) - ballsBowled;
        const currentRunRate = ballsBowled > 0 ? (currentInning.score / ballsBowled) * 6 : 6;
        
        // Win Probability
        let winProb = 50;
        if (target) {
            const runsNeeded = target - currentInning.score + 1;
            const reqRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 99;
            
            if (runsNeeded <= 0) winProb = 100;
            else if (ballsRemaining <= 0) winProb = 0;
            else {
                // Simple logistic-like heuristic
                const rateDiff = currentRunRate - reqRate;
                const wicketsFactor = (10 - currentInning.wickets) * 5;
                winProb = 50 + (rateDiff * 10) + (wicketsFactor - 25); // Base 50, adjust by rate and wickets
                if (currentInning.wickets >= 9) winProb -= 30;
            }
        } else {
            // Batting first
            const projScore = currentInning.score + (currentRunRate * (ballsRemaining/6));
            const parScore = maxOvers === 20 ? 160 : 280;
            winProb = 50 + ((projScore - parScore) / 2);
        }
        winProb = Math.max(0, Math.min(100, winProb));

        // Projected Scores
        const projCurrent = Math.round(currentInning.score + (currentRunRate * (ballsRemaining/6)));
        const proj6 = Math.round(currentInning.score + (6 * (ballsRemaining/6)));
        const proj8 = Math.round(currentInning.score + (8 * (ballsRemaining/6)));
        const proj10 = Math.round(currentInning.score + (10 * (ballsRemaining/6)));

        // Player Prediction
        const striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
        let playerProj = 0;
        if (striker) {
            // Assume they face 40% of remaining balls if top order, less if tail
            const expectedBalls = ballsRemaining * 0.4; 
            const currentSR = striker.balls > 0 ? (striker.runs / striker.balls) : 0.8; // Default 80 SR
            playerProj = Math.round(striker.runs + (expectedBalls * currentSR));
        }

        return {
            winProb: Math.round(winProb),
            projCurrent,
            proj6,
            proj8,
            proj10,
            playerProj
        };
    }, [state, gameData.currentFormat]);


    if (!state) return <div className="h-full flex items-center justify-center bg-slate-900 text-white">Loading Match...</div>;

    const { battingTeam, bowlingTeam, innings, currentInningIndex, currentBatters, currentBowlerId, lastBallSpeed, recentBalls, commentary, target, waitingFor, strategies } = state;
    
    const isUserBatting = battingTeam?.id === gameData.userTeamId;
    const isUserBowling = bowlingTeam?.id === gameData.userTeamId;

    const handleExit = () => {
        // If match not finished, save state
        if (state.status !== 'completed') {
            onExit(state);
        } else {
            onExit();
        }
    };

    if (showPreMatch && state.status === 'ready') {
        return <PreMatchPanel match={match} gameData={gameData} onStart={() => setShowPreMatch(false)} />;
    }

    if (state.status === 'post_toss') {
        return <PostTossInfoScreen state={state} gameData={gameData} onProceed={() => proceedToMatch()} />;
    }

    if (state.status === 'toss') {
        return (
            <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <h2 className="text-3xl font-bold mb-8 text-teal-400">Match Toss</h2>
                <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border border-slate-700 relative">
                    {tvLogo && (
                        <div className={`absolute -top-12 right-0 w-16 h-16 opacity-80 ${tvColor}`} dangerouslySetInnerHTML={{ __html: tvLogo }} />
                    )}
                    <div className="flex justify-between items-center mb-6 text-lg font-semibold">
                         <span>{match.teamA}</span>
                         <span className="text-slate-500">vs</span>
                         <span>{match.teamB}</span>
                    </div>
                    {tossState === 'coin' ? (
                        <button 
                            onClick={() => {
                                const winner = Math.random() > 0.5 ? gameData.teams.find(t => t.name === match.teamA) : gameData.teams.find(t => t.name === match.teamB);
                                if (winner?.id === gameData.userTeamId) {
                                    setTossState('result');
                                } else {
                                    const decision = Math.random() > 0.5 ? 'bat' : 'bowl';
                                    startMatch(winner!.id, decision);
                                }
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition hover:scale-105"
                        >
                            🪙 FLIP COIN
                        </button>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-green-400 font-bold text-xl">You won the toss!</p>
                            <p className="text-slate-300">What would you like to do?</p>
                            <div className="flex gap-4">
                                <button onClick={() => startMatch(gameData.userTeamId, 'bat')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold">BAT 🏏</button>
                                <button onClick={() => startMatch(gameData.userTeamId, 'bowl')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold">BOWL ⚾</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentInning = innings[currentInningIndex];
    // Celebration Popup
    const renderCelebration = () => {
        if (!state.milestoneEvent) return null;
        const { title, message, type, playerId } = state.milestoneEvent;
        const p = gameData.allPlayers.find(pl => pl.id === playerId);
        if (!p) return null;

        const currentFormat = gameData.currentFormat;
        const stats = p.stats[currentFormat];
        const currentBatPerf = striker?.playerId === p.id ? striker : nonStriker?.playerId === p.id ? nonStriker : null;
        const currentBowlPerf = bowler?.playerId === p.id ? bowler : null;

        // Calculate "Living Stats" (Career + current match contribution)
        const livingRuns = stats.runs + (currentBatPerf?.runs || 0);
        const livingHighest = Math.max(stats.highestScore, currentBatPerf?.runs || 0);
        const livingStrikeRate = stats.ballsFaced + (currentBatPerf?.balls || 0) > 0 
            ? (livingRuns / (stats.ballsFaced + (currentBatPerf?.balls || 0))) * 100 
            : 0;
        const livingDismissals = stats.dismissals + (currentBatPerf?.isOut ? 1 : 0);
        const livingAvg = livingDismissals > 0 ? (livingRuns / livingDismissals) : livingRuns;
        const livingFifties = stats.fifties + (currentBatPerf?.runs >= 50 && currentBatPerf?.runs < 100 ? 1 : 0);
        const livingHundreds = stats.hundreds + (currentBatPerf?.runs >= 100 ? 1 : 0);

        const livingWickets = stats.wickets + (currentBowlPerf?.wickets || 0);
        const livingRunsConceded = stats.runsConceded + (currentBowlPerf?.runsConceded || 0);
        const livingBallsBowled = stats.ballsBowled + (currentBowlPerf?.ballsBowled || 0);
        const livingEconomy = livingBallsBowled > 0 ? (livingRunsConceded / livingBallsBowled) * 6 : 0;
        const livingFiveWickets = stats.fiveWicketHauls + (currentBowlPerf?.wickets >= 5 ? 1 : 0);

        const teamData = gameData.allTeamsData.find(t => t.id === (p.teamName === teamA?.name ? teamA?.id : teamB?.id));
        const accentColor = type === 'batting' ? 'text-teal-400' : type === 'bowling' ? 'text-cyan-400' : 'text-yellow-400';
        const borderColor = type === 'batting' ? 'border-teal-500' : type === 'bowling' ? 'border-cyan-500' : 'border-yellow-500';

        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => proceedToMatch()}>
                <div className={`relative bg-slate-900 border-2 ${borderColor} rounded-3xl p-6 sm:p-8 shadow-2xl text-center w-full max-w-md animate-pop-in overflow-hidden shadow-teal-500/10`}>
                    {/* Background Texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    
                    {/* Header: Team & Icon */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12" dangerouslySetInnerHTML={{ __html: teamData?.logo || '' }} />
                        <div className={`w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner`}>
                            {type === 'batting' ? '🏏' : type === 'bowling' ? '⚡' : '⭐'}
                        </div>
                        <div className="w-12 h-12 opacity-0" /> {/* Spacer */}
                    </div>

                    <div className="space-y-1 mb-6">
                        <h2 className={`text-2xl sm:text-3xl font-black italic tracking-tighter leading-none ${accentColor}`}>{title}</h2>
                        <h3 className="text-white text-lg font-bold">{p.name}</h3>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{teamData?.name}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentFormat}</span>
                        </div>
                    </div>

                    {/* Match Contribution Sub-Header */}
                    <div className="bg-slate-800/50 rounded-xl p-3 mb-6 border border-slate-700/50">
                        {currentBatPerf ? (
                            <p className="text-white font-medium text-sm">
                                <span className="text-teal-400 font-bold text-lg">{currentBatPerf.runs}{currentBatPerf.isOut ? '' : '*'}</span>
                                <span className="text-slate-400 text-xs ml-1">off {currentBatPerf.balls} balls</span>
                                <span className="mx-2 text-slate-700">|</span>
                                <span className="text-xs text-slate-300 font-mono tracking-tight">{currentBatPerf.fours}x4, {currentBatPerf.sixes}x6</span>
                            </p>
                        ) : currentBowlPerf ? (
                            <p className="text-white font-medium text-sm">
                                <span className="text-cyan-400 font-bold text-lg">{currentBowlPerf.wickets}/{currentBowlPerf.runsConceded}</span>
                                <span className="text-slate-400 text-xs ml-1">in {currentBowlPerf.overs} ovs</span>
                            </p>
                        ) : (
                            <p className="text-white text-sm opacity-60">Season Milestone</p>
                        )}
                    </div>

                    {/* 2x3 Stat Grid */}
                    <div className="grid grid-cols-3 border border-slate-700 rounded-xl overflow-hidden divide-x divide-y divide-slate-700">
                        {[
                            { label: 'Matches', val: stats.matches + 1 },
                            { label: 'Total Runs', val: livingRuns },
                            { label: 'Strike Rate', val: livingStrikeRate.toFixed(1) },
                            { label: 'Average', val: livingAvg.toFixed(1) },
                            { label: '50s / 100s', val: `${livingFifties}/${livingHundreds}` },
                            { label: 'High Score', val: livingHighest }
                        ].map((s, i) => (
                            <div key={i} className="bg-slate-800/30 p-2 sm:p-3">
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">{s.label}</p>
                                <p className="text-white font-bold text-sm sm:text-base font-mono">{s.val}</p>
                            </div>
                        ))}
                    </div>

                    <button className={`mt-8 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-95`}>
                        TAP TO DISMISS
                    </button>
                    
                    {/* Confetti Animation Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl opacity-40">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`absolute w-1.5 h-1.5 rounded-full animate-confetti ${i % 2 === 0 ? 'bg-teal-500' : 'bg-white'}`} style={{ 
                                left: `${5 + i * 12}%`, 
                                top: '-20px', 
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: `${2 + Math.random()}s`
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
    const nonStriker = currentInning.batting.find(b => b.playerId === currentBatters.nonStrikerId);
    const bowler = currentInning.bowling.find(b => b.playerId === currentBowlerId);

    const runRate = parseFloat(currentInning.overs) > 0 ? (currentInning.score / parseFloat(currentInning.overs)).toFixed(2) : "0.00";
    let reqRate = "N/A";
    let runsNeeded = 0;
    let ballsRemaining = 0;
    
    if (target) {
        runsNeeded = target - currentInning.score + 1;
        const totalBalls = (gameData.currentFormat.includes('T20') ? 20 : 50) * 6;
        const ballsBowled = Math.floor(parseFloat(currentInning.overs)) * 6 + (parseFloat(currentInning.overs) % 1 * 10);
        ballsRemaining = totalBalls - ballsBowled;
        if (ballsRemaining > 0) {
             reqRate = (runsNeeded / (ballsRemaining/6)).toFixed(2);
        }
    }

    const fielders = [
        { x: 160, y: 80 }, { x: 240, y: 80 }, { x: 100, y: 160 }, { x: 300, y: 160 },
        { x: 120, y: 280 }, { x: 280, y: 280 }, { x: 200, y: 340 }, { x: 60, y: 200 }, { x: 340, y: 200 }
    ];

    const lastBall = recentBalls.length > 0 ? recentBalls[0] : null;
    const isWicket = lastBall === 'W';
    const isBoundary = lastBall === '4' || lastBall === '6';

    // --- Selection Modals ---
    const renderSelectionModal = (title: string, options: any[], onSelect: (id: any) => void, onConfirm: () => void, selectedValue: string, setValue: (v: string) => void, extraSelect?: any) => {
        if (state.autoPlayType === 'inning' || state.autoPlayType === 'match') return <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white font-bold animate-pulse">Simulating...</div>;
        return (
            <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6">
                <h3 className="text-xl font-bold mb-2 text-white text-center">{title}</h3>
                {autoArrivalSeconds !== null && (
                    <div className="bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono rounded px-3 py-1 mb-4 flex items-center gap-2">
                        <span>⚡ Auto-complying with default recommendation in <strong className="text-white text-xs">{autoArrivalSeconds}s</strong></span>
                        <button onClick={handleOverrideAuto} className="bg-teal-700 hover:bg-teal-600 text-white font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer">
                            Pause Auto
                        </button>
                    </div>
                )}
                <div className="w-full max-w-sm space-y-4 bg-slate-800 p-4 rounded-lg shadow-xl">
                    {extraSelect}
                    <select 
                        className="w-full p-2 bg-slate-900 text-white rounded border border-slate-600 font-bold" 
                        value={selectedValue} 
                        onChange={e => {
                            setValue(e.target.value);
                            handleOverrideAuto();
                        }}
                    >
                        <option value="">Select Player</option>
                        {options.map(p => <option key={p.playerId} value={p.playerId}>{p.playerName} {p.overs ? `(${p.overs} overs)` : ''}</option>)}
                    </select>
                    <button 
                        disabled={!selectedValue || (extraSelect && !selectedOpener1)}
                        onClick={() => {
                            handleOverrideAuto();
                            onConfirm();
                        }}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-slate-900 font-black uppercase tracking-wider py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm Selection
                    </button>
                </div>
            </div>
        );
    };

    // --- Match Centre Overlay ---
    const renderMatchCentre = () => (
        <div className="absolute inset-0 bg-slate-900/95 z-40 flex flex-col p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-teal-400">Match Centre</h2>
                <button onClick={() => setShowMatchCentre(false)} className="p-2 bg-slate-800 rounded-full"><Icons.X className="h-5 w-5" /></button>
            </div>
            
            <div className="flex bg-slate-800 rounded-lg p-1 mb-4 overflow-x-auto">
                {['scorecard', 'commentary', 'analysis', 'gameplan'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-md ${activeTab === tab ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                {activeTab === 'scorecard' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-yellow-400 mb-2 border-b border-slate-700 pb-1">Batting</h3>
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-500 text-left"><th className="pb-1">Batter</th><th className="text-right pb-1">R</th><th className="text-right pb-1">B</th><th className="text-right pb-1">4s</th><th className="text-right pb-1">6s</th><th className="text-right pb-1">SR</th></tr></thead>
                                <tbody>
                                    {currentInning.batting.map(b => (
                                        <tr key={b.playerId} className={`border-b border-slate-700/50 ${b.isOut ? 'text-slate-500' : 'text-white'}`}>
                                            <td className="py-1.5 font-medium">
                                                {b.playerName} {b.playerId === currentBatters.strikerId ? '*' : ''}
                                                <div className="text-[9px] text-slate-500 font-normal">{b.dismissalText}</div>
                                            </td>
                                            <td className="text-right font-bold">{b.runs}</td>
                                            <td className="text-right">{b.balls}</td>
                                            <td className="text-right">{b.fours}</td>
                                            <td className="text-right">{b.sixes}</td>
                                            <td className="text-right">{b.balls > 0 ? Math.round((b.runs/b.balls)*100) : 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-blue-400 mb-2 border-b border-slate-700 pb-1">Bowling</h3>
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-500 text-left"><th className="pb-1">Bowler</th><th className="text-right pb-1">O</th><th className="text-right pb-1">M</th><th className="text-right pb-1">R</th><th className="text-right pb-1">W</th><th className="text-right pb-1">Econ</th></tr></thead>
                                <tbody>
                                    {currentInning.bowling.filter(b => parseFloat(b.overs) > 0 || b.playerId === currentBowlerId).map(b => (
                                        <tr key={b.playerId} className="border-b border-slate-700/50 text-white">
                                            <td className="py-1.5 font-medium">{b.playerName} {b.playerId === currentBowlerId ? '🥎' : ''}</td>
                                            <td className="text-right">{b.overs}</td>
                                            <td className="text-right">{b.maidens}</td>
                                            <td className="text-right">{b.runsConceded}</td>
                                            <td className="text-right font-bold text-yellow-400">{b.wickets}</td>
                                            <td className="text-right">{b.ballsBowled > 0 ? ((b.runsConceded/b.ballsBowled)*6).toFixed(1) : '0.0'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'commentary' && (
                    <div className="space-y-2" ref={commentaryRef}>
                        {commentary.map((line, i) => (
                            <div key={i} className="bg-slate-800 p-2 rounded text-xs font-mono text-slate-300 border-l-2 border-teal-500">
                                {line}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'analysis' && predictions && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Win Probability</h3>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden relative">
                                <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs mt-1 font-bold">
                                <span className="text-teal-400">{gameData.userTeamId === battingTeam.id ? battingTeam.name : bowlingTeam.name} {battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                                <span className="text-slate-400">{gameData.userTeamId !== battingTeam.id ? battingTeam.name : bowlingTeam.name} {battingTeam.id !== gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Projected Score</h3>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">Current Rate</div>
                                    <div className="text-xl font-bold text-white">{predictions.projCurrent}</div>
                                </div>
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">At 8 RPO</div>
                                    <div className="text-xl font-bold text-white">{predictions.proj8}</div>
                                </div>
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">At 10 RPO</div>
                                    <div className="text-xl font-bold text-white">{predictions.proj10}</div>
                                </div>
                                 <div className="bg-slate-700/50 p-2 rounded border border-yellow-600/30">
                                    <div className="text-[10px] text-yellow-400 uppercase">Safe Score</div>
                                    <div className="text-xl font-bold text-yellow-400">{gameData.currentFormat.includes('T20') ? 175 : 285}</div>
                                 </div>
                            </div>
                        </div>

                        {/* Match Phase Stats */}
                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Live Match Phase Stats</h3>
                            <div className="space-y-4">
                                {(() => {
                                    const activeInning = state.innings[state.currentInningIndex];
                                    const ppRuns = activeInning.ppRuns || 0;
                                    const ppWickets = activeInning.ppWickets || 0;
                                    const ppBalls = activeInning.ppBalls || 0;
                                    const ppRR = ppBalls > 0 ? (ppRuns / (ppBalls / 6)).toFixed(2) : '0.00';

                                    const moRuns = activeInning.moRuns || 0;
                                    const moWickets = activeInning.moWickets || 0;
                                    const moBalls = activeInning.moBalls || 0;
                                    const moDots = activeInning.moDots || 0;
                                    const moFours = activeInning.moFours || 0;
                                    const moSixes = activeInning.moSixes || 0;
                                    const moBoundPct = moBalls > 0 ? (((moFours + moSixes) / moBalls) * 100).toFixed(1) : '0.0';
                                    const moDotPct = moBalls > 0 ? ((moDots / moBalls) * 100).toFixed(1) : '0.0';

                                    const doRuns = activeInning.doRuns || 0;
                                    const doWickets = activeInning.doWickets || 0;
                                    const doBalls = activeInning.doBalls || 0;
                                    const doSR = doBalls > 0 ? ((doRuns / doBalls) * 100).toFixed(1) : '0.0';
                                    const doEco = doBalls > 0 ? (doRuns / (doBalls / 6)).toFixed(2) : '0.00';

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Powerplay */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Powerplay</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">Overs 0-6</span>
                                                </div>
                                                <div className="text-lg font-black text-white">{ppRuns}/{ppWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>RR: <span className="text-white font-bold">{ppRR}</span></div>
                                                    <div>Balls: <span className="text-white">{ppBalls}</span></div>
                                                </div>
                                            </div>

                                            {/* Middle Overs */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Middle Overs</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">Overs 7-15</span>
                                                </div>
                                                <div className="text-lg font-black text-white">{moRuns}/{moWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>Bdry %: <span className="text-white font-bold">{moBoundPct}%</span></div>
                                                    <div>Dot %: <span className="text-white font-bold">{moDotPct}%</span></div>
                                                </div>
                                            </div>

                                            {/* Death Overs */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Death Overs</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">Overs 16-20</span>
                                                </div>
                                                <div className="text-lg font-black text-white">{doRuns}/{doWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>SR: <span className="text-white font-bold">{doSR}</span></div>
                                                    <div>Eco: <span className="text-white font-bold">{doEco}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-2">Player Prediction</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">{striker?.playerName} to score</span>
                                <span className="text-xl font-bold text-teal-400">{predictions.playerProj}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Based on current strike rate and match situation.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'gameplan' && (
                    <GameplanView 
                        state={state} 
                        gameData={gameData} 
                        onToggleExploit={toggleExploitWeakness}
                        onSetBattingStrategy={setBattingStrategy}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white font-sans overflow-hidden relative">
            {renderCelebration()}
            <style>{`
                @keyframes ball-path {
                    0% { cy: 175; cx: 205; opacity: 0; }
                    20% { opacity: 1; }
                    100% { cy: 220; cx: 200; }
                }
                @keyframes bat-swing {
                    0% { transform: rotate(0deg); }
                    50% { transform: rotate(-45deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-ball { animation: ball-path 0.5s ease-in forwards; }
                .animate-bat { animation: bat-swing 0.3s ease-out; transform-origin: top center; }
                @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
                @keyframes pop-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
                .animate-confetti { animation: confetti 2s ease-out forwards; }
            `}</style>

            {/* Broadcaster Overlay */}
            {tvLogo && (
                <div className="absolute top-14 right-2 z-20 flex flex-col items-end pointer-events-none animate-fade-in">
                    <div className={`w-16 h-12 opacity-80 flex items-center justify-end ${tvColor}`} dangerouslySetInnerHTML={{ __html: tvLogo }} />
                    <div className="bg-red-600 text-white text-[8px] font-bold px-1 rounded flex items-center gap-1">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span> LIVE
                    </div>
                </div>
            )}

            {/* Signify AI Button */}
            <div className="absolute top-28 right-2 z-20">
                <button onClick={() => setShowSignify(true)} className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white border-2 border-white/20 active:scale-95 transition-transform">
                    <Icons.Bot />
                </button>
            </div>

            {/* Clickable Area for Auto-Dismiss (Only visible when timer is active) */}
            {autoArrivalSeconds !== null && (
                <div 
                    className="absolute inset-0 z-25 cursor-pointer" 
                    onClick={handleOverrideAuto}
                    title="Click anywhere to skip timer"
                ></div>
            )}

            {/* Auto Arrival Notification */}
            {autoArrivalSeconds !== null && nextAutoPlayerId && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none"> 
                    {/* Wrapper to position centered, content inside */}
                    <AutoArrivalNotification 
                        playerName={getPlayerById(nextAutoPlayerId, gameData.allPlayers).name} 
                        onOverride={handleOverrideAuto} 
                        secondsLeft={autoArrivalSeconds} 
                    />
                </div>
            )}

            {waitingFor === 'openers' && renderSelectionModal("Select Opening Pair", currentInning.batting.filter(p => !p.isOut && p.playerId !== selectedOpener1), (id) => setSelectedOpener2(id), () => { selectOpeners(selectedOpener1, selectedOpener2); setSelectedOpener1(''); setSelectedOpener2(''); }, selectedOpener2, setSelectedOpener2, (
                <div>
                    <label className="text-sm text-gray-300 block mb-1">Striker</label>
                    <select className="w-full p-2 bg-slate-900 text-white rounded border border-slate-600" value={selectedOpener1} onChange={e => setSelectedOpener1(e.target.value)}>
                        <option value="">Select Player</option>
                        {currentInning.batting.filter(p => !p.isOut).map(p => <option key={p.playerId} value={p.playerId}>{p.playerName}</option>)}
                    </select>
                </div>
            ))}
            {waitingFor === 'batter' && renderSelectionModal("Select Next Batter", currentInning.batting.filter(p => !p.isOut && p.playerId !== currentBatters.nonStrikerId && p.playerId !== currentBatters.strikerId), (id) => setSelectedBatter(id), () => { selectNextBatter(selectedBatter); setSelectedBatter(''); }, selectedBatter, setSelectedBatter)}
            {waitingFor === 'bowler' && renderSelectionModal("Select Next Bowler", currentInning.bowling.filter(p => p.playerId !== currentBowlerId), (id) => setSelectedBowler(id), () => { selectNextBowler(selectedBowler); setSelectedBowler(''); }, selectedBowler, setSelectedBowler)}

            {showMatchCentre && renderMatchCentre()}
            {showSignify && <SignifyChat gameData={gameData} onClose={() => setShowSignify(false)} />}
            
            {scoutingPlayerId && (
                <ScoutingOverlay 
                    player={getPlayerById(scoutingPlayerId, gameData.allPlayers)}
                    onClose={() => setScoutingPlayerId(null)}
                    currentBowlingPerf={currentInning.bowling.find(b => b.playerId === scoutingPlayerId)}
                    currentBattingPerf={currentInning.batting.find(b => b.playerId === scoutingPlayerId)}
                    isBattingMode={isUserBatting}
                    onPlaySafeToggle={togglePlaySafe}
                    activeBatterId={currentBatters.strikerId}
                    activeBowlerId={currentBowlerId}
                    isPlayingSafe={state.playSafeAgainst?.[currentBatters.strikerId] === currentBowlerId}
                />
            )}

            {/* TOP BAR */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-2 flex justify-between items-center shadow-lg z-20 border-b border-slate-700 flex-shrink-0 relative">
                 <div className="flex flex-col max-w-[40%]">
                     <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">{gameData.currentFormat}</span>
                     <span className="text-xs font-bold text-white truncate">{match.teamA} vs {match.teamB}</span>
                 </div>
                 <div className="flex items-center gap-3">
                     <button onClick={handleExit} className="text-xs text-red-400 border border-red-900 bg-red-900/20 px-2 py-1 rounded hover:bg-red-900/40">
                        {state.status === 'completed' ? 'Exit' : 'Save & Exit'}
                     </button>
                     <div className="text-right">
                         <div className="text-[10px] text-slate-400 uppercase">Over</div>
                         <div className="text-sm font-mono font-bold text-cyan-400">{currentInning.overs}</div>
                     </div>
                     <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 flex-shrink-0">
                         <span className="text-[10px] font-bold">{target ? '2nd' : '1st'}</span>
                     </div>
                 </div>
                 
                 {/* Win Probability Bar - HUD */}
                 <div className="absolute bottom-0 left-0 w-full h-1 flex">
                    <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${battingTeam.id === gameData.userTeamId ? predictions?.winProb : 100 - (predictions?.winProb||50)}%` }} />
                    <div className="h-full bg-blue-600 transition-all duration-500 flex-1" />
                 </div>
            </div>

            {/* MAIN FIELD */}
            <div className="flex-1 relative bg-[#2d5a27] overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20 pointer-events-none"></div>
                
                {/* Top Left Stats */}
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm border-l-4 border-yellow-500 p-2 rounded-r-lg shadow-lg min-w-[120px]">
                    <div className="text-[10px] text-yellow-400 font-bold uppercase mb-1">{battingTeam.name}</div>
                    <div className="text-2xl font-extrabold text-white leading-none mb-1">{currentInning.score}/{currentInning.wickets}</div>
                    <div className="text-[9px] text-gray-300 flex justify-between gap-2">
                        <span>CRR: {runRate}</span>
                        {target && <span>RRR: {reqRate}</span>}
                    </div>
                </div>

                {/* Top Right Stats */}
                <div className="absolute top-16 right-4 z-10 bg-black/60 backdrop-blur-sm border-r-4 border-blue-500 p-2 rounded-l-lg shadow-lg min-w-[120px] text-right">
                     <div className="text-[10px] text-blue-400 font-bold uppercase mb-1">{bowlingTeam.name}</div>
                     {target ? (
                         <>
                            <div className="text-lg font-bold text-white leading-none mb-1">{runsNeeded} <span className="text-xs font-normal text-gray-300">off</span> {ballsRemaining}</div>
                            <div className="text-[9px] text-gray-300">Target: {target + 1}</div>
                         </>
                     ) : (
                         <>
                            <div className="text-lg font-bold text-white leading-none mb-1">{predictions?.projCurrent || '-'}</div>
                            <div className="text-[9px] text-gray-300">Projected Score</div>
                         </>
                     )}
                </div>

                {/* Field SVG */}
                <div className="w-full h-full flex items-center justify-center p-2">
                    <svg viewBox="0 0 400 400" className="h-full w-full max-h-[60vh] max-w-md drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <pattern id="grass" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                <rect width="10" height="10" fill="#35682d" />
                                <circle cx="1" cy="1" r="1" fill="#3e7a35" />
                            </pattern>
                        </defs>
                        <circle cx="200" cy="200" r="190" fill="url(#grass)" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.8" />
                        <circle cx="200" cy="200" r="80" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="4,4" />
                        <rect x="196" y="170" width="8" height="60" fill="#d2b48c" stroke="#bfa07a" strokeWidth="0.5" />
                        <line x1="194" y1="178" x2="206" y2="178" stroke="white" strokeWidth="0.5" />
                        <line x1="194" y1="222" x2="206" y2="222" stroke="white" strokeWidth="0.5" />
                        <circle cx="200" cy="177" r="1" fill="black" />
                        <circle cx="200" cy="223" r="1" fill="black" />
                        
                        <g transform="translate(200, 165)" className="cursor-pointer" onClick={() => handlePlayerScouting(bowler?.playerId)}>
                             <circle r="3" fill="#ef4444" stroke="white" strokeWidth="1" />
                             <text y="-4" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">{bowler?.playerName.split(' ').pop()?.substring(0,1)}</text>
                        </g>
                        
                         <g transform="translate(200, 225)" className="cursor-pointer" onClick={() => handlePlayerScouting(striker?.playerId)}>
                             <circle r="3" fill="#eab308" stroke="white" strokeWidth="1" />
                             <rect x="2" y="-1" width="2" height="8" fill="#854d0e" className={lastBall ? "animate-bat" : ""} transform="rotate(15)" />
                        </g>
                        
                        <g transform="translate(190, 178)" className="cursor-pointer" onClick={() => handlePlayerScouting(nonStriker?.playerId)}>
                             <circle r="3" fill="#eab308" stroke="white" strokeWidth="1" opacity="0.8" />
                        </g>
                        
                        <g transform="translate(200, 235)">
                             <circle r="2" fill="black" stroke="white" strokeWidth="0.5" />
                        </g>

                        {fielders.map((pos, i) => (
                            <circle key={i} cx={pos.x} cy={pos.y} r="3" fill="#ef4444" stroke="white" strokeWidth="0.5" opacity="0.9" />
                        ))}
                        
                        {lastBall && (
                            <circle cx="200" cy="175" r="1.5" fill="white" className="animate-ball" />
                        )}
                    </svg>
                </div>

                {/* Ball Result Overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                    {lastBall && (
                        <div className={`
                            flex items-center justify-center rounded-full h-20 w-20 
                            ${isWicket ? 'bg-red-600' : isBoundary ? 'bg-purple-600' : 'bg-slate-800/80'}
                            border-4 border-white shadow-2xl animate-bounce
                        `}>
                            <span className="text-3xl font-black text-white">{lastBall === 'W' ? 'OUT' : lastBall}</span>
                        </div>
                    )}
                </div>
                
                <div className="absolute bottom-2 right-2 z-10">
                    <button onClick={() => setShowMatchCentre(true)} className="bg-slate-800/90 text-xs font-bold text-white px-4 py-2 rounded-full border border-slate-600 shadow-lg flex items-center gap-2 animate-pulse">
                        <Icons.ChartPie /> Match Centre
                    </button>
                </div>
            </div>

            {/* BOTTOM INFO BAR */}
            <div className="bg-slate-800 border-t border-slate-700 p-1 flex-shrink-0">
                <div className="flex items-stretch bg-slate-900/50 rounded overflow-hidden text-xs">
                    
                    {/* Bowler Stats */}
                    <div className="flex-1 p-2 border-r border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handlePlayerScouting(bowler?.playerId)}>
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Bowling</div>
                        <div className="font-bold text-white truncate">{bowler?.playerName}</div>
                        <div className="text-slate-400 font-mono text-[10px] flex flex-col gap-1">
                            <span className="text-sm font-bold text-cyan-400">{bowler?.wickets}-{bowler?.runsConceded} <span className="text-[10px] font-normal text-slate-500">({bowler?.overs})</span></span>
                            <span>Econ: {bowler?.ballsBowled ? ((bowler.runsConceded / bowler.ballsBowled) * 6).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>

                    {/* Batters Stats - Enhanced */}
                    <div className="flex-[2] flex">
                        <div className={`flex-1 p-2 border-r border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors ${striker?.playerId === currentBatters.strikerId ? 'bg-yellow-900/20' : ''}`} onClick={() => handlePlayerScouting(striker?.playerId)}>
                            <div className="text-[9px] text-yellow-500/70 uppercase font-bold flex justify-between">
                                <span>Striker</span>
                                {striker?.playerId === currentBatters.strikerId && <span>★</span>}
                            </div>
                            <div className="font-bold text-yellow-400 truncate">{striker?.playerName}</div>
                            <div className="text-[10px] text-slate-300 font-mono flex flex-col gap-1 mt-0.5">
                                <span className="text-sm font-bold text-yellow-500">{striker?.runs} <span className="text-[10px] text-slate-500 font-normal">({striker?.balls})</span></span>
                                <span className="text-slate-400">SR: {striker?.balls ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0'} • 4s:{striker?.fours || 0} 6s:{striker?.sixes || 0}</span>
                            </div>
                        </div>
                        <div className={`flex-1 p-2 border-r border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors ${nonStriker?.playerId === currentBatters.strikerId ? 'bg-yellow-900/20' : ''}`} onClick={() => handlePlayerScouting(nonStriker?.playerId)}>
                            <div className="text-[9px] text-slate-500 uppercase font-bold flex justify-between">
                                <span>Non-Striker</span>
                                {nonStriker?.playerId === currentBatters.strikerId && <span className="text-yellow-500">★</span>}
                            </div>
                            <div className="font-bold text-white truncate">{nonStriker?.playerName}</div>
                            <div className="text-[10px] text-slate-300 font-mono flex flex-col gap-1 mt-0.5">
                                <span className="text-sm font-bold text-white">{nonStriker?.runs} <span className="text-[10px] text-slate-500 font-normal">({nonStriker?.balls})</span></span>
                                <span className="text-slate-400 text-[10px]">SR: {nonStriker?.balls ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : '0.0'} • 4s:{nonStriker?.fours || 0} 6s:{nonStriker?.sixes || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Last Ball */}
                    <div className="flex-1 p-2 text-right">
                        <div className="text-[9px] text-slate-500 uppercase font-bold leading-none mb-1">Last Ball</div>
                        <div className="flex flex-col items-end">
                            <div className={`font-black text-2xl leading-none ${isWicket ? 'text-red-500' : isBoundary ? 'text-purple-400' : 'text-white'}`}>
                                {lastBall || '-'}
                            </div>
                            {lastBallSpeed && (
                                <div className="text-cyan-400 font-mono text-[10px] mt-1 bg-cyan-400/10 px-1 rounded border border-cyan-400/20 shadow-sm animate-pulse">
                                    {lastBallSpeed} <span className="text-[8px] opacity-70">KPH</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROL PANEL */}
            <div className="bg-slate-900 p-3 pb-6 flex-shrink-0">
                 <div className="flex gap-2 mb-3">
                    {isUserBatting && striker && nonStriker && (
                        <div className="flex gap-2 flex-grow">
                            <StrategyToggle 
                                label={striker.playerName.split(' ').pop() || 'Striker'} 
                                value={strategies.batting[striker.playerId] || 'balanced'} 
                                onChange={(s) => setBattingStrategy(striker.playerId, s)} 
                            />
                            <StrategyToggle 
                                label={nonStriker.playerName.split(' ').pop() || 'Non-Striker'} 
                                value={strategies.batting[nonStriker.playerId] || 'balanced'} 
                                onChange={(s) => setBattingStrategy(nonStriker.playerId, s)} 
                            />
                        </div>
                    )}
                    {isUserBowling && (
                        <StrategyToggle label="Bowling Tactics" value={strategies.bowling} onChange={setBowlingStrategy} />
                    )}
                 </div>

                <div className="flex items-center gap-2 mb-4 overflow-x-auto py-1 scrollbar-hide">
                     <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Over:</span>
                     {recentBalls.slice(0, 8).map((b, i) => (
                         <div key={i} className={`
                            h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${b === 'W' ? 'bg-red-600 text-white' : b === '6' ? 'bg-purple-600 text-white' : b === '4' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}
                         `}>
                             {b}
                         </div>
                     ))}
                </div>

                <div className="flex gap-2">
                    {state.status === 'completed' ? (
                        <button onClick={handleExit} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 uppercase tracking-wider">
                            End Match
                        </button>
                    ) : (
                        <>
                            <button onClick={playBall} className={`flex-1 ${isUserBatting ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2`}>
                                <Icons.Play className="h-5 w-5" />
                                <span className="hidden sm:inline">{isUserBatting ? 'PLAY' : 'BOWL'}</span>
                            </button>
                            <button onClick={playOver} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                <span className="text-lg">⏭</span>
                                <span className="hidden sm:inline">OVER</span>
                            </button>
                            <button onClick={simulateInning} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                <span className="hidden sm:inline">INNING</span>
                                <span className="sm:hidden">INN</span>
                            </button>
                            <button onClick={simulateMatch} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                                <Icons.RefreshCw className="h-5 w-5" />
                                <span className="hidden sm:inline">END</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveMatchScreen;
