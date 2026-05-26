
import React, { useState, useEffect } from 'react';
import { GameData, Format, Standing, Match } from '../types';
import { Category, getFormatsForCategory, resolveMatch } from '../utils';
import { CategoryTabs, FormatDropdown } from './SharedUI';

interface StandingsProps {
    gameData: GameData;
}

const StandingRow: React.FC<{ standing: Standing; index: number; isFirstClass: boolean }> = ({ standing, index, isFirstClass }) => (
    <tr className={`border-b dark:border-gray-700/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${index < 4 ? 'bg-teal-500/5' : ''}`}>
        <td className="p-3 font-semibold">
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                {standing.teamName}
            </div>
        </td>
        <td className="p-3 text-center">{standing.played}</td>
        <td className="p-3 text-center">{standing.won}</td>
        <td className="p-3 text-center">{standing.lost}</td>
        {isFirstClass && <td className="p-3 text-center">{standing.drawn}</td>}
        <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400">{standing.points}</td>
        <td className="p-3 text-center font-mono text-xs">{standing.netRunRate > 0 ? `+${standing.netRunRate.toFixed(2)}` : standing.netRunRate.toFixed(2)}</td>
    </tr>
);

const FixtureItem: React.FC<{ match: Match; resolved: Match; result?: any }> = ({ match, resolved, result }) => (
    <div className={`p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm ${result ? 'bg-white dark:bg-gray-800/40' : 'bg-gray-50 dark:bg-gray-900/20'}`}>
        <div className="flex justify-between items-center text-[10px] mb-1 text-gray-400 uppercase tracking-wider font-bold">
            <span>Match {match.matchNumber}</span>
            <span>{match.date}</span>
        </div>
        <div className="text-center font-medium text-sm py-1">
            <span>{resolved.teamA}</span>
            <span className="mx-2 text-[10px] text-gray-400 font-normal italic">vs</span>
            <span>{resolved.teamB}</span>
        </div>
        {result && (
            <div className="text-center text-[11px] mt-1 text-blue-500 dark:text-blue-400 font-semibold italic">
                {result.summary}
            </div>
        )}
    </div>
);

const Standings: React.FC<StandingsProps> = ({ gameData }) => {
    const [category, setCategory] = useState<Category>('T20');
    const [selectedFormat, setSelectedFormat] = useState<Format>(gameData.currentFormat);
    const [view, setView] = useState<'standings' | 'fixtures'>('standings');

    useEffect(() => {
        const formats = getFormatsForCategory(category);
        if (!formats.includes(selectedFormat)) {
            setSelectedFormat(formats[0]);
        }
    }, [category]);

    const standings = gameData.standings[selectedFormat] || [];
    const schedule = gameData.schedule[selectedFormat] || [];
    const isFirstClass = selectedFormat === Format.SHIELD;

    return (
        <div className="p-4 flex flex-col h-full overflow-hidden">
            <h2 className="text-2xl font-bold text-center mb-6 tracking-tight">Leagues</h2>
            
            <CategoryTabs category={category} setCategory={setCategory} />
            <FormatDropdown category={category} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} />

            <div className="flex justify-center mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-center">
                <button 
                    onClick={() => setView('standings')} 
                    className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'standings' ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Standings
                </button>
                <button 
                    onClick={() => setView('fixtures')} 
                    className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'fixtures' ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Fixtures
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {view === 'standings' ? (
                    <div className="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Team</th>
                                    <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">P</th>
                                    <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">W</th>
                                    <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">L</th>
                                    {isFirstClass && <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">D</th>}
                                    <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">Pts</th>
                                    <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">NRR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((s, index) => (
                                    <StandingRow key={s.teamId} standing={s} index={index} isFirstClass={isFirstClass} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {schedule.map((match, index) => (
                            <FixtureItem 
                                key={`${selectedFormat}-fixture-${index}`}
                                match={match}
                                resolved={resolveMatch(match, gameData, selectedFormat)}
                                result={gameData.matchResults[selectedFormat]?.find(r => r.matchNumber === match.matchNumber)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Standings;
