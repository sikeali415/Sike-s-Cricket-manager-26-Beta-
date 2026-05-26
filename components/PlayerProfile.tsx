
import React, { useState, useMemo } from 'react';
import { Player, Format } from '../types';
import { getRoleColor, getRoleFullName, aggregateStats, getPlayerBadges, generateScoutReport } from '../utils';

interface PlayerProfileProps {
    player: Player | null;
    onBack: () => void;
    initialFormat: Format;
    currentSeason: number;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onBack, initialFormat, currentSeason }) => {
    const [selectedFormat, setSelectedFormat] = useState<Format | 'Summary'>(initialFormat);
    
    // Track whether to show season or all-time stats
    const [showSeasonStats, setShowSeasonStats] = useState(false);
    
    const summaryStats = useMemo(() => {
        if (!player) return null;
        
        const t20Formats = [Format.T20];
        const listAFormats = [Format.ODI];
        const fcFormats = [Format.SHIELD];
        
        const t20 = aggregateStats(player, t20Formats);
        const listA = aggregateStats(player, listAFormats);
        const fc = aggregateStats(player, fcFormats);
        const overall = aggregateStats(player, [...t20Formats, ...listAFormats, ...fcFormats]);

        return { t20, listA, fc, overall };
    }, [player]);

    if (!player || !summaryStats) return <div>Player not found. <button onClick={onBack}>Back</button></div>;
    
    const allTimeStats = selectedFormat === 'Summary' ? summaryStats.overall : player.stats[selectedFormat];
    const seasonStats = (selectedFormat !== 'Summary' && player.seasonStats?.[currentSeason]?.[selectedFormat]) ? player.seasonStats[currentSeason][selectedFormat] : null;
    
    const stats = showSeasonStats && seasonStats ? seasonStats : allTimeStats;
    
    return (
        <div className="p-4 h-[calc(100vh-90px)] overflow-y-auto">
            <button onClick={onBack} className="mb-2 text-sm text-teal-500">&larr; Back to Stats</button>
            <div className="text-center mb-4">
                <h2 className="text-3xl font-bold">{player.name}</h2>
                <p className={`${getRoleColor(player.role)} font-semibold`}>{getRoleFullName(player.role)}</p>
                {player.teamName && <p className="text-sm text-gray-500">{player.teamName}</p>}
                
                {/* Badges Display */}
                <div className="flex flex-wrap gap-1.5 justify-center mt-3 max-w-md mx-auto">
                    {getPlayerBadges(player).map((badge, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 border border-amber-400 shadow-sm">
                            🏆 {badge}
                        </span>
                    ))}
                </div>
            </div>

            {/* Career Summary Table */}
            <div className="mb-6 overflow-x-auto">
                <h3 className="font-bold text-lg mb-2 text-center">Career Summary</h3>
                <table className="w-full text-xs text-center">
                    <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            <th className="p-1 text-left">Format</th>
                            <th className="p-1">M</th>
                            <th className="p-1">Runs</th>
                            <th className="p-1">Avg</th>
                            <th className="p-1">SR</th>
                            <th className="p-1">Wkts</th>
                            <th className="p-1">Avg</th>
                            <th className="p-1">Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                         <tr className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="p-1 text-left font-semibold">First Class</td>
                            <td className="p-1">{summaryStats.fc.matches}</td>
                            <td className="p-1 font-bold">{summaryStats.fc.runs}</td>
                            <td className="p-1">{summaryStats.fc.average.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.fc.strikeRate.toFixed(1)}</td>
                            <td className="p-1 font-bold">{summaryStats.fc.wickets}</td>
                            <td className="p-1">{summaryStats.fc.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.fc.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="p-1 text-left font-semibold">List A</td>
                            <td className="p-1">{summaryStats.listA.matches}</td>
                            <td className="p-1 font-bold">{summaryStats.listA.runs}</td>
                            <td className="p-1">{summaryStats.listA.average.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.listA.strikeRate.toFixed(1)}</td>
                            <td className="p-1 font-bold">{summaryStats.listA.wickets}</td>
                            <td className="p-1">{summaryStats.listA.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.listA.economy.toFixed(2)}</td>
                        </tr>
                         <tr className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="p-1 text-left font-semibold">T20s</td>
                            <td className="p-1">{summaryStats.t20.matches}</td>
                            <td className="p-1 font-bold">{summaryStats.t20.runs}</td>
                            <td className="p-1">{summaryStats.t20.average.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.t20.strikeRate.toFixed(1)}</td>
                            <td className="p-1 font-bold">{summaryStats.t20.wickets}</td>
                            <td className="p-1">{summaryStats.t20.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.t20.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-teal-50 dark:bg-teal-900/20 font-bold">
                            <td className="p-1 text-left">Overall</td>
                            <td className="p-1">{summaryStats.overall.matches}</td>
                            <td className="p-1">{summaryStats.overall.runs}</td>
                            <td className="p-1">{summaryStats.overall.average.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.overall.strikeRate.toFixed(1)}</td>
                            <td className="p-1">{summaryStats.overall.wickets}</td>
                            <td className="p-1">{summaryStats.overall.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1">{summaryStats.overall.economy.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            {/* Scout Report Section */}
            <div className="mb-8 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-teal-500">🔍</span>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-slate-500 dark:text-slate-400">Scout Report</h3>
                </div>
                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic font-medium">
                        "{generateScoutReport(player, initialFormat)}"
                    </p>
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="flex-1 text-center font-mono py-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black">Primary Style</p>
                        <p className="text-xs font-bold text-teal-400">{player.style}</p>
                    </div>
                    <div className="flex-1 text-center font-mono py-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black">Weakness</p>
                        <p className="text-xs font-bold text-red-400">{player.weaknesses?.[0] || 'NONE'}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-center overflow-x-auto border-b border-gray-300 dark:border-gray-700 mb-2 pb-2">
                 {Object.values(Format).map(format => (
                    <button key={format} onClick={() => setSelectedFormat(format)} className={`px-3 py-1 text-xs whitespace-nowrap font-semibold ${selectedFormat === format ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>{format}</button>
                ))}
            </div>
            {seasonStats && (
                <div className="flex justify-center mb-4">
                    <button onClick={() => setShowSeasonStats(!showSeasonStats)} className={`px-4 py-1 text-xs font-bold rounded-full ${showSeasonStats ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {showSeasonStats ? 'Showing Season' : 'Showing All-Time'}
                    </button>
                </div>
            )}
            
            {selectedFormat !== 'Summary' && (
            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-center">{selectedFormat} {showSeasonStats ? `(${currentSeason})` : 'Details'}</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.matches}</p><p className="text-xs text-gray-500">Matches</p></div>
                    <div><p className="font-bold text-xl text-amber-600">{stats.runs}</p><p className="text-xs text-gray-500">Runs</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.highestScore}</p><p className="text-xs text-gray-500">Highest</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.average.toFixed(2)}</p><p className="text-xs text-gray-500">Average</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.strikeRate.toFixed(2)}</p><p className="text-xs text-gray-500">Strike Rate</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.fifties}</p><p className="text-xs text-gray-500">50s</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.hundreds}</p><p className="text-xs text-gray-500">100s</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.fours}</p><p className="text-xs text-gray-500">Fours</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.sixes}</p><p className="text-xs text-gray-500">Sixes</p></div>
                </div>
                 <h3 className="font-bold text-lg mt-4 mb-2 text-center text-teal-600">Bowling Stats</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-bold text-xl text-teal-600 dark:text-teal-400">{stats.wickets}</p><p className="text-xs text-gray-500">Wickets</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.bowlingAverage.toFixed(2)}</p><p className="text-xs text-gray-500">Average</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.economy.toFixed(2)}</p><p className="text-xs text-gray-500">Economy</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.bestBowling}</p><p className="text-xs text-gray-500">Best</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.threeWicketHauls}</p><p className="text-xs text-gray-500">3-fers</p></div>
                    <div><p className="font-bold text-xl text-slate-700 dark:text-slate-200">{stats.fiveWicketHauls}</p><p className="text-xs text-gray-500">5-fers</p></div>
                </div>
                 <h3 className="font-bold text-lg mt-4 mb-2 text-center">Milestones</h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div><p className="font-bold text-xl">{stats.fastestFifty > 0 ? `${stats.fastestFifty}` : '-'}</p><p className="text-xs text-gray-500">Fastest 50 (balls)</p></div>
                    <div><p className="font-bold text-xl">{stats.fastestHundred > 0 ? `${stats.fastestHundred}` : '-'}</p><p className="text-xs text-gray-500">Fastest 100 (balls)</p></div>
                </div>

                {/* Phase Stats (T20 and One-Day) */}
                {(selectedFormat.includes('T20') || selectedFormat.includes('One-Day') || selectedFormat.includes('Cup')) && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-bold text-lg mb-3 text-center text-teal-600 dark:text-teal-400">Phase-wise Performance</h3>
                        
                        <div className="space-y-4">
                            {/* Batting Phases */}
                            <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-left text-gray-500 mb-2">Batting Phase Records</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            <th className="p-1.5 text-left">Phase</th>
                                            <th className="p-1.5 text-center">Runs</th>
                                            <th className="p-1.5 text-center">Balls</th>
                                            <th className="p-1.5 text-center">SR</th>
                                            <th className="p-1.5 text-center">Outs</th>
                                            <th className="p-1.5 text-center">Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { code: 'pp', name: 'Powerplay (PP)' },
                                            { code: 'mo', name: 'Middle Overs (MO)' },
                                            { code: 'do', name: 'Death Overs (DO)' }
                                        ].map(ph => {
                                            // @ts-ignore
                                            const st = stats.phaseStats.batting?.[ph.code] || { runs: 0, balls: 0, dismissals: 0 };
                                            const sr = st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : '0.0';
                                            const avg = st.dismissals > 0 ? (st.runs / st.dismissals).toFixed(1) : st.runs > 0 ? st.runs.toFixed(1) : '-';
                                            return (
                                                <tr key={ph.code}>
                                                    <td className="p-1.5 font-semibold text-left">{ph.name}</td>
                                                    <td className="p-1.5 text-center font-bold">{st.runs}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.balls}</td>
                                                    <td className="p-1.5 text-center text-amber-600 dark:text-amber-400 font-medium">{sr}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.dismissals}</td>
                                                    <td className="p-1.5 text-center font-semibold">{avg}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bowling Phases */}
                            <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-left text-gray-500 mb-2">Bowling Phase Records</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            <th className="p-1.5 text-left">Phase</th>
                                            <th className="p-1.5 text-center">Wkts</th>
                                            <th className="p-1.5 text-center">Runs</th>
                                            <th className="p-1.5 text-center">Balls</th>
                                            <th className="p-1.5 text-center">Econ</th>
                                            <th className="p-1.5 text-center">SR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { code: 'pp', name: 'Powerplay (PP)' },
                                            { code: 'mo', name: 'Middle Overs (MO)' },
                                            { code: 'do', name: 'Death Overs (DO)' }
                                        ].map(ph => {
                                            // @ts-ignore
                                            const st = stats.phaseStats.bowling?.[ph.code] || { wickets: 0, runsConceded: 0, ballsBowled: 0 };
                                            const econ = st.ballsBowled > 0 ? ((st.runsConceded / st.ballsBowled) * 6).toFixed(2) : '0.00';
                                            const sr = st.wickets > 0 ? (st.ballsBowled / st.wickets).toFixed(1) : '-';
                                            return (
                                                <tr key={ph.code}>
                                                    <td className="p-1.5 font-semibold text-left">{ph.name}</td>
                                                    <td className="p-1.5 text-center font-bold text-teal-600 dark:text-teal-400">{st.wickets}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.runsConceded}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.ballsBowled}</td>
                                                    <td className="p-1.5 text-center font-medium">{econ}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{sr}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batting Position Stats */}
                {stats.positionStats && Object.keys(stats.positionStats).length > 0 && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-bold text-lg mb-3 text-center text-teal-600 dark:text-teal-400">Batting by Position (All Formats)</h3>
                        <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        <th className="p-1.5 text-left">Position</th>
                                        <th className="p-1.5 text-center">Innings</th>
                                        <th className="p-1.5 text-center">Runs</th>
                                        <th className="p-1.5 text-center">Average</th>
                                        <th className="p-1.5 text-center">SR</th>
                                        <th className="p-1.5 text-center">30s / 50s / 100s</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {Object.entries(stats.positionStats)
                                        .map(([posStr, st]) => ({ pos: Number(posStr), ...(st as any) }))
                                        .filter(p => p.innings > 0)
                                        .sort((a, b) => a.pos - b.pos)
                                        .map(p => {
                                            const avg = p.dismissals > 0 ? (p.runs / p.dismissals).toFixed(1) : p.runs > 0 ? p.runs.toFixed(1) : '-';
                                            const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
                                            const label = p.pos === 1 || p.pos === 2 ? `#${p.pos} Opener` : p.pos === 3 ? `#3 One Down` : `#${p.pos}`;
                                            return (
                                                <tr key={p.pos}>
                                                    <td className="p-1.5 font-semibold text-left text-gray-700 dark:text-gray-300">{label}</td>
                                                    <td className="p-1.5 text-center">{p.innings}</td>
                                                    <td className="p-1.5 text-center font-bold text-teal-600 dark:text-teal-400">{p.runs}</td>
                                                    <td className="p-1.5 text-center font-semibold">{avg}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{sr}</td>
                                                    <td className="p-1.5 text-center text-gray-500 font-medium">
                                                        {p.thirties || 0} / {p.fifties || 0} / {p.hundreds || 0}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {Object.values(stats.positionStats).filter((st: any) => st.innings > 0).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-gray-500 italic">No innings recorded at any position yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    )
}

export default PlayerProfile;
