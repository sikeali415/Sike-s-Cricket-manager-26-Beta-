
import React from 'react';
import { MatchResult } from '../types';

interface ForwardResultsScreenProps {
    results: MatchResult[];
    onBack: () => void;
    userTeamId: string;
}

const ForwardResultsScreen: React.FC<ForwardResultsScreenProps> = ({ results, onBack }) => {
    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-2xl font-bold text-center mb-2">Simulated Results</h2>
            <div className="flex-grow overflow-y-auto space-y-2">
                {results.map((result, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800/50 p-2 rounded-lg">
                        <p className="text-sm font-semibold">{result.firstInning.teamName} vs {result.secondInning.teamName}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{result.summary}</p>
                    </div>
                ))}
            </div>
            <button onClick={onBack} className="w-full mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg">Continue</button>
        </div>
    );
};

export default ForwardResultsScreen;
