
import React, { useState, useEffect } from 'react';
import { GameData, Team, MatchResult, Format, Match } from '../types';
import { Category, getFormatsForCategory, resolveMatch } from '../utils';
import { CategoryTabs, FormatDropdown } from './SharedUI';

interface ScheduleProps {
    gameData: GameData;
    userTeam: Team | null;
    viewMatchResult: (result: MatchResult) => void;
}

const MatchItem: React.FC<{
    match: Match;
    resolved: Match;
    result?: MatchResult;
    isUserMatch: boolean;
    isNextMatch: boolean;
    userTeamName?: string;
    onViewResult: (result: MatchResult) => void;
}> = ({ match, resolved, result, isUserMatch, isNextMatch, userTeamName, onViewResult }) => (
    <div className={`p-3 rounded-lg shadow-md transition-all ${result ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-200 dark:bg-gray-700/40'} ${isNextMatch ? 'ring-2 ring-teal-500' : ''}`}>
        <div className="flex justify-between items-center text-xs mb-1 text-gray-500 dark:text-gray-400">
            <span className="font-medium">Match {match.matchNumber}</span>
            <span>{match.date}</span>
        </div>
        <div className="text-center font-semibold text-lg py-1">
            <span className={isUserMatch && resolved.teamA === userTeamName ? 'text-teal-500 dark:text-teal-400' : ''}>{resolved.teamA}</span>
            <span className="mx-3 text-gray-400 text-sm font-normal">vs</span>
            <span className={isUserMatch && resolved.teamB === userTeamName ? 'text-teal-500 dark:text-teal-400' : ''}>{resolved.teamB}</span>
        </div>
        {result && (
            <div className="text-center text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">{result.summary}</p>
                <button 
                    onClick={() => onViewResult(result)}
                    className="bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 px-4 py-1.5 text-xs font-bold rounded-full hover:bg-teal-500 hover:text-white transition-all uppercase tracking-wider"
                >
                    View Scorecard
                </button>
            </div>
        )}
    </div>
);

const Schedule: React.FC<ScheduleProps> = ({ gameData, userTeam, viewMatchResult }) => {
    const [category, setCategory] = useState<Category>('T20');
    const [selectedFormat, setSelectedFormat] = useState<Format>(gameData.currentFormat);

    useEffect(() => {
        const formats = getFormatsForCategory(category);
        if (!formats.includes(selectedFormat)) {
            setSelectedFormat(formats[0]);
        }
    }, [category]);

    const schedule = gameData.schedule[selectedFormat] || [];

    return (
        <div className="p-4 flex flex-col h-full">
            <h2 className="text-2xl font-bold text-center mb-6 tracking-tight">Schedule</h2>
            
            <CategoryTabs category={category} setCategory={setCategory} />
            <FormatDropdown category={category} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} />

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {schedule.map((match, index) => {
                    const resolved = resolveMatch(match, gameData, selectedFormat);
                    const result = gameData.matchResults[selectedFormat]?.find(r => r.matchNumber === match.matchNumber);
                    const isUserMatch = !!userTeam && (resolved.teamA === userTeam.name || resolved.teamB === userTeam.name);
                    const isNextMatch = selectedFormat === gameData.currentFormat && index === gameData.currentMatchIndex[selectedFormat];
                    
                    return (
                        <MatchItem 
                            key={`${selectedFormat}-${match.matchNumber}-${index}`}
                            match={match}
                            resolved={resolved}
                            result={result}
                            isUserMatch={isUserMatch}
                            isNextMatch={isNextMatch}
                            userTeamName={userTeam?.name}
                            onViewResult={viewMatchResult}
                        />
                    );
                })}
                {schedule.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No matches scheduled for this format.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Schedule;
