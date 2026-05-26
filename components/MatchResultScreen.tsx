import React, { useState } from 'react';
import { MatchResult, Inning } from '../types';

interface ScorecardDisplayProps {
    inning: Inning;
    inningNumber: number;
}

const ScorecardDisplay: React.FC<ScorecardDisplayProps> = ({ inning, inningNumber }) => {
    const getBallsFromOvers = (overs: string) => {
        const parts = overs.split('.');
        const oversN = parseInt(parts[0], 10) || 0;
        const ballsN = parseInt(parts[1] || '0', 10);
        return (oversN * 6) + ballsN;
    };

    // Fix: Strictly preserve walk-out order by sorting by battingPosition if available, or using original array order.
    // We sort a copy to avoid mutating props.
    const sortedBatting = React.useMemo(() => {
        return [...inning.batting].sort((a, b) => {
            const posA = a.battingPosition ?? 999;
            const posB = b.battingPosition ?? 999;
            return posA - posB;
        });
    }, [inning.batting]);

    return (
        <div className="mb-4">
            <div className="flex justify-between items-baseline bg-gray-200 dark:bg-gray-800 p-2 rounded-t-lg">
                <h3 className="text-lg font-bold">{inning.teamName} <span className="text-sm font-normal">({inningNumber <= 2 ? `${inningNumber === 1 ? '1st' : '2nd'}` : `${inningNumber === 3 ? '3rd' : '4th'}`} Innings)</span></h3>
                <p className="font-mono text-xl">{inning.score} / {inning.wickets} <span className="text-sm">({inning.overs})</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800/50 p-2 rounded-b-lg text-xs">
                <h4 className="font-semibold mb-1">Batting</h4>
                <table className="w-full">
                    <thead className="text-gray-500">
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left font-normal py-1">Batter</th>
                            <th className="text-left font-normal w-1/3">Dismissal</th>
                            <th className="text-right font-normal">R</th>
                            <th className="text-right font-normal">B</th>
                            <th className="text-right font-normal">SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBatting.map(p => (
                            <tr key={p.playerId} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-1 font-semibold">{p.playerName}</td>
                                <td className="text-gray-500 dark:text-gray-400">{p.dismissalText}</td>
                                <td className="text-right font-bold">{p.runs}</td>
                                <td className="text-right">{p.balls}</td>
                                <td className="text-right">{p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h4 className="font-semibold mt-3 mb-1">Bowling</h4>
                <table className="w-full">
                     <thead className="text-gray-500">
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left font-normal py-1">Bowler</th>
                            <th className="text-right font-normal">O</th>
                            <th className="text-right font-normal">M</th>
                            <th className="text-right font-normal">R</th>
                            <th className="text-right font-normal">W</th>
                            <th className="text-right font-normal">Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inning.bowling.map(p => (
                            <tr key={p.playerId} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-1 font-semibold">{p.playerName}</td>
                                <td className="text-right">{p.overs}</td>
                                <td className="text-right">{p.maidens}</td>
                                <td className="text-right">{p.runsConceded}</td>
                                <td className="text-right font-bold">{p.wickets}</td>
                                <td className="text-right">{getBallsFromOvers(p.overs) > 0 ? ((p.runsConceded / getBallsFromOvers(p.overs)) * 6).toFixed(2) : "0.00"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface MatchResultScreenProps {
    result: MatchResult | null;
    onBack: () => void;
    userTeamId: string;
}

const MatchResultScreen: React.FC<MatchResultScreenProps> = ({ result, onBack, userTeamId }) => {
    const [view, setView] = useState<'summary' | 'scorecard'>('summary');
    
    if (!result) return <div className="p-4">No match result found. <button onClick={onBack}>Go Back</button></div>;
    const { firstInning, secondInning, thirdInning, fourthInning, summary, manOfTheMatch } = result;

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
             <div className="text-center bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-2">
                <h2 className="text-xl font-bold">{summary}</h2>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Man of the Match: {manOfTheMatch.playerName} ({manOfTheMatch.summary})</p>
             </div>
             
             <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2">
                <button onClick={() => setView('summary')} className={`px-4 py-2 font-semibold ${view === 'summary' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Summary</button>
                <button onClick={() => setView('scorecard')} className={`px-4 py-2 font-semibold ${view === 'scorecard' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Full Scorecard</button>
            </div>
             <div className="flex-grow overflow-y-auto pr-1">
                 {view === 'summary' && (
                     <div>
                        {[firstInning, secondInning, thirdInning, fourthInning].filter(Boolean).map((inning, idx) => (
                             <div key={idx} className="mb-4">
                                <div className="flex justify-between items-baseline bg-gray-200 dark:bg-gray-800 p-2 rounded-t-lg">
                                    <h3 className={`text-lg font-bold ${inning!.teamId === userTeamId ? 'text-teal-500' : ''}`}>{inning!.teamName}</h3>
                                    <p className="font-mono text-xl">{inning!.score} / {inning!.wickets} <span className="text-sm">({inning!.overs})</span></p>
                                </div>
                                <div className="bg-white dark:bg-gray-800/50 p-2 rounded-b-lg">
                                    <h4 className="font-semibold text-sm mb-1">Top Performers</h4>
                                    {inning!.batting.length > 0 && [...inning!.batting].sort((a,b) => b.runs - a.runs).slice(0,2).map(b => <p key={b.playerId} className="text-xs">{b.playerName} {b.runs}{b.isOut ? '' : '*'}({b.balls})</p>)}
                                    {inning!.bowling.length > 0 && [...inning!.bowling].sort((a,b) => b.wickets - a.wickets).slice(0,1).map(b => <p key={b.playerId} className="text-xs">{b.playerName} {b.wickets} / {b.runsConceded}</p>)}
                                </div>
                            </div>
                        ))}
                     </div>
                 )}
                 {view === 'scorecard' && (
                     <div>
                        <ScorecardDisplay inning={firstInning} inningNumber={1} />
                        {secondInning && <ScorecardDisplay inning={secondInning} inningNumber={2} />}
                        {thirdInning && <ScorecardDisplay inning={thirdInning} inningNumber={3} />}
                        {fourthInning && <ScorecardDisplay inning={fourthInning} inningNumber={4} />}
                     </div>
                 )}
             </div>
             <button onClick={onBack} className="w-full mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg">Continue</button>
        </div>
    )
};

export default MatchResultScreen;