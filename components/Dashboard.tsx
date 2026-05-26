
import React from 'react';
import { GameData, Team, CareerScreen } from '../types';
import { Icons } from './Icons';
import { SPONSOR_THRESHOLDS, TOURNAMENT_LOGOS } from '../data';

interface DashboardProps {
    gameData: GameData;
    userTeam: Team | null;
    setScreen: (screen: CareerScreen) => void;
    handlePlayMatch: () => void;
    handleForwardDay: () => void;
    optimizeAllSquads: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ gameData, userTeam, setScreen, handlePlayMatch, handleForwardDay, optimizeAllSquads }) => {
    const currentSchedule = gameData.schedule[gameData.currentFormat];
    const matchIndex = gameData.currentMatchIndex[gameData.currentFormat];
    const sponsorship = gameData.sponsorships?.[gameData.currentFormat];
    const popularity = gameData.popularity || 0;
    const currentThresholds = SPONSOR_THRESHOLDS[gameData.currentFormat] || {};

    if (matchIndex >= currentSchedule.length) {
        return (
            <div className="p-8 h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 rounded-2xl shadow-md border-t-4 border-teal-500 m-2">
                <div className="text-4xl mb-4">🏆</div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Tournament Complete!</h2>
                <p className="text-slate-500 text-xs mb-6 max-w-sm">Every single fixture of the {gameData.currentFormat} format has concluded. Choose below to view tournament achievements, champion crowning, and future draft planning.</p>
                <button 
                    onClick={() => setScreen('END_OF_FORMAT')}
                    className="w-full max-w-xs bg-teal-500 hover:bg-teal-600 text-white font-extrabold uppercase py-4 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-wider"
                >
                    View Season Results & Awards
                </button>
            </div>
        );
    }

    let nextMatch = { ...currentSchedule[matchIndex] };
    if (nextMatch.group !== 'Round-Robin') {
        const standings = gameData.standings[gameData.currentFormat];
        const getTeamName = (pos: number) => standings.length >= pos ? standings[pos - 1]?.teamName : `TBD ${pos}`;
        const resolvePlaceholder = (placeholder: string) => {
            if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                return getTeamName(parseInt(placeholder[0], 10));
            }
            if (placeholder.startsWith('SF')) {
                const sfMatchNumber = placeholder.split(' ')[0];
                const sfResult = gameData.matchResults[gameData.currentFormat].find(r => r.matchNumber === sfMatchNumber);
                if (sfResult?.winnerId) {
                    return gameData.teams.find(t => t.id === sfResult.winnerId)?.name || 'TBD';
                }
                return `Winner of ${sfMatchNumber}`;
            }
            return placeholder;
        };
        nextMatch.teamA = resolvePlaceholder(nextMatch.teamA);
        nextMatch.teamB = resolvePlaceholder(nextMatch.teamB);
    }

    // Safety fix: Case-insensitive and trimmed name comparison for user match detection
    const isUserMatch = userTeam ? (
        nextMatch.teamA.trim().toLowerCase() === userTeam.name.trim().toLowerCase() || 
        nextMatch.teamB.trim().toLowerCase() === userTeam.name.trim().toLowerCase()
    ) : false;
    
    const teamAData = gameData.allTeamsData.find(t => t.name === nextMatch.teamA);
    const homeGround = teamAData ? gameData.grounds.find(g => g.code === teamAData.homeGround) : null;

    const renderTournamentLogo = () => {
        if (sponsorship?.tournamentLogo) {
            return <div className={`w-8 h-8 mx-auto mb-1 ${sponsorship.logoColor}`} dangerouslySetInnerHTML={{__html: sponsorship.tournamentLogo}}></div>;
        }
        return <div className="w-8 h-8 mx-auto mb-1 text-slate-300" dangerouslySetInnerHTML={{__html: TOURNAMENT_LOGOS[0].svg}}></div>;
    };

    return (
        <div className="p-4 space-y-4 relative">
            {/* Universal Optimize Button (Small Top-Right Icon) */}
            <button 
                onClick={optimizeAllSquads}
                className="absolute top-4 right-4 p-2.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-teal-500/30 text-teal-500 hover:scale-110 active:scale-95 transition-all z-10 group"
                title="Universal Optimize"
            >
                <div className="w-5 h-5" dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>` }}></div>
                <span className="absolute right-0 top-full mt-2 w-auto p-1.5 min-w-max rounded-md shadow-md text-white bg-gray-900 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Universal Optimize
                </span>
            </button>

            <header className="text-center pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest mb-1">SEASON {gameData.currentSeason}</p>
                {renderTournamentLogo()}
                {sponsorship ? (
                     <h1 className={`text-2xl md:text-3xl mt-1 ${sponsorship.logoColor || 'text-teal-500'} drop-shadow-sm ${sponsorship.sponsorName === "Sike's" ? 'font-extrabold tracking-tight font-display' : sponsorship.sponsorName === "Signify" ? 'font-sans tracking-widest uppercase font-bold' : sponsorship.sponsorName === "Malik" ? 'font-serif italic font-bold' : 'font-mono font-bold'}`}>
                        {sponsorship.sponsorName} <span className="text-gray-800 dark:text-white font-light italic">{sponsorship.tournamentName}</span>
                    </h1>
                ) : (
                    <h1 className="text-2xl font-bold mt-1">{gameData.currentFormat}</h1>
                )}
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-1">Manager: {userTeam?.name || 'N/A'}</p>
            </header>

            {/* Status Badge */}
            <div className="flex justify-center mb-2">
                <div className="bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,1)]"></div>
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Dynamic Simulation Active</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 shadow-md border-t-4 border-teal-500">
                <h3 className="font-bold text-lg mb-2 text-center text-teal-600 dark:text-teal-400 uppercase tracking-wide">Next Match</h3>
                <div className="text-center">
                    <p className="font-extrabold text-xl md:text-2xl">{nextMatch.teamA} <span className="text-gray-400 text-lg font-light">vs</span> {nextMatch.teamB}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{homeGround?.name || 'Neutral Venue'}</p>
                    <p className="text-xs font-mono text-gray-400">{nextMatch.date}</p>
                </div>
                {isUserMatch ? (
                    <button onClick={handlePlayMatch} className="mt-4 w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-transform transform active:scale-95">
                        <Icons.PlayMatch />
                        <span>PLAY MATCH</span>
                    </button>
                ) : (
                    <button onClick={handleForwardDay} className="mt-4 w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-transform transform active:scale-95">
                        <Icons.PlayMatch />
                        <span>SIMULATE DAY</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                 <button onClick={() => setScreen('LEAGUES')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Leagues /></div>
                    <span className="font-semibold text-xs">Leagues</span>
                </button>
                 <button onClick={() => setScreen('PLAYER_DATABASE')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Database /></div>
                    <span className="font-semibold text-xs">Database</span>
                </button>
                 <button onClick={() => setScreen('LINEUPS')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Lineups /></div>
                    <span className="font-semibold text-xs">Lineups</span>
                </button>
                 <button onClick={() => setScreen('EDITOR')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Editor /></div>
                    <span className="font-semibold text-xs">Editor</span>
                </button>
                <button onClick={() => setScreen('TRANSFERS')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Transfers /></div>
                    <span className="font-semibold text-xs">Transfers</span>
                </button>
                <button onClick={() => setScreen('COMPARISON')} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-md flex flex-col items-center justify-center space-y-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-center group">
                    <div className="group-hover:scale-110 transition-transform"><Icons.Compare /></div>
                    <span className="font-semibold text-xs">Compare</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
