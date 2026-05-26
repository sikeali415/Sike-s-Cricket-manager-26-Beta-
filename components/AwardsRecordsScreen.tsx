
import React, { useMemo } from 'react';
import { GameData } from '../types';
import { Icons } from './Icons';

interface AwardsRecordsScreenProps {
    gameData: GameData;
}

const AwardsAndRecordsScreen: React.FC<AwardsRecordsScreenProps> = ({ gameData }) => {
    const { awardsHistory, records, promotionHistory } = gameData;
    
    const sortedBvb = useMemo(() => records ? [...records.batterVsBowler].sort((a,b) => b.dismissals - a.dismissals || b.runs - a.runs) : [], [records]);
    const sortedTvt = useMemo(() => records ? [...records.teamVsTeam].sort((a,b) => b.matches - a.matches) : [], [records]);
    const sortedPvt = useMemo(() => records ? [...records.playerVsTeam].sort((a,b) => (b.runs + b.wickets * 20) - (a.runs + a.wickets * 20)) : [], [records]);

    if (awardsHistory.length === 0 && (!records || sortedBvb.length === 0) && promotionHistory.length === 0) {
        return <div className="p-4 text-center h-full flex items-center justify-center">No awards or records to show yet. Complete a tournament to see your accolades!</div>
    }

    const groupedBySeason = awardsHistory.reduce((acc: any, award) => {
        (acc[award.season] = acc[award.season] || []).push(award);
        return acc;
    }, {});

    return (
        <div className="p-2 h-[calc(100vh-90px)] overflow-y-auto">
            <h2 className="text-2xl font-bold text-center mb-4">🏆 Awards & 📊 Records</h2>
            <div className="space-y-6">
                {promotionHistory.length > 0 && (
                    <div>
                         <h3 className="text-xl font-semibold mb-2 text-teal-500 dark:text-teal-400">Promotions & Relegations</h3>
                         <div className="space-y-2">
                            {promotionHistory.map((ph, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm flex flex-col gap-1 text-sm">
                                    <p className="font-bold text-gray-500">Season {ph.season}</p>
                                    <div className="flex items-center gap-2">
                                        <Icons.TrendingUp />
                                        <span>Promoted: <span className="font-bold text-green-600 dark:text-green-400">{ph.promotedTeamName}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Icons.TrendingDown />
                                        <span>Relegated: <span className="font-bold text-red-600 dark:text-red-400">{ph.relegatedTeamName}</span></span>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                <div>
                    <h3 className="text-xl font-semibold mb-2 text-teal-500 dark:text-teal-400">Season Awards</h3>
                    <div className="space-y-4">
                        {Object.entries(groupedBySeason).reverse().map(([season, awards]: [string, any]) => (
                            <div key={season}>
                                <h4 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Season {season}</h4>
                                <div className="space-y-3">
                                    {awards.map((award: any) => (
                                        <div key={award.format} className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
                                            <p className="font-bold">{award.format} Champions: <span className="text-yellow-600 dark:text-yellow-400">{award.winnerTeamName}</span></p>
                                            <p className="text-sm mt-1">Best Batter: {award.bestBatter.playerName} ({award.bestBatter.runs} runs)</p>
                                            <p className="text-sm">Best Bowler: {award.bestBowler.playerName} ({award.bestBowler.wickets} wickets)</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {records && (
                    <div>
                        <h3 className="text-xl font-semibold my-4 text-teal-500 dark:text-teal-400">Career Records</h3>
                        <div className="space-y-4 text-xs">
                            <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
                                <h4 className="font-bold mb-2">Batter vs Bowler</h4>
                                <table className="w-full">
                                    <thead><tr className="border-b dark:border-gray-600 text-gray-500"><th className="text-left py-1">Matchup</th><th className="text-center">Runs</th><th className="text-center">Balls</th><th className="text-center">Outs</th></tr></thead>
                                    <tbody>{sortedBvb.slice(0, 10).map(r => <tr key={`${r.batterId}-${r.bowlerId}`} className="border-b dark:border-gray-700/50"><td className="py-1">{r.batterName}<br/>vs {r.bowlerName}</td><td className="text-center">{r.runs}</td><td className="text-center">{r.balls}</td><td className="text-center font-bold">{r.dismissals}</td></tr>)}</tbody>
                                </table>
                            </div>
                            <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
                                <h4 className="font-bold mb-2">Team vs Team</h4>
                                <table className="w-full">
                                     <thead><tr className="border-b dark:border-gray-600 text-gray-500"><th className="text-left py-1">Matchup</th><th className="text-center">Played</th><th className="text-center">Result</th></tr></thead>
                                     <tbody>{sortedTvt.slice(0, 10).map(r => <tr key={`${r.teamAId}-${r.teamBId}`} className="border-b dark:border-gray-700/50"><td className="py-1">{r.teamAName} vs<br/>{r.teamBName}</td><td className="text-center">{r.matches}</td><td className="text-center font-bold">{r.teamAWins}-{r.matches - r.teamAWins}</td></tr>)}</tbody>
                                </table>
                            </div>
                             <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
                                <h4 className="font-bold mb-2">Player vs Team</h4>
                                <table className="w-full">
                                    <thead><tr className="border-b dark:border-gray-600 text-gray-500"><th className="text-left py-1">Matchup</th><th className="text-center">Runs</th><th className="text-center">Wkts</th></tr></thead>
                                     <tbody>{sortedPvt.slice(0, 10).map(r => <tr key={`${r.playerId}-${r.vsTeamId}`} className="border-b dark:border-gray-700/50"><td className="py-1">{r.playerName}<br/>vs {r.vsTeamName}</td><td className="text-center">{r.runs > 0 ? `${r.runs}(${r.balls})` : '-'}</td><td className="text-center">{r.wickets > 0 ? `${r.wickets}/${r.runsConceded}`: '-'}</td></tr>)}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AwardsAndRecordsScreen;
