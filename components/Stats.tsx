
import React, { useState, useMemo, useEffect } from 'react';
import { GameData, Format, Player, PlayerStats } from '../types';
import { aggregateStats } from '../utils';

interface StatsProps {
    gameData: GameData;
    viewPlayerProfile: (player: Player, format: Format) => void;
}

type StatFormatOption = Format | 'All_T20' | 'All_ListA' | 'All_FC' | 'Overall';

const Stats: React.FC<StatsProps> = ({ gameData, viewPlayerProfile }) => {
    const [statType, setStatType] = useState<'batting' | 'bowling' | 'milestones' | 'phase'>('batting');
    const [category, setCategory] = useState<'T20' | 'List A' | 'First Class'>('T20');
    const [selectedFormatOption, setSelectedFormatOption] = useState<StatFormatOption>(gameData.currentFormat);
    const [sortConfig, setSortConfig] = useState({ key: 'runs', direction: 'descending' });

    const getFormatsForCategory = (cat: 'T20' | 'List A' | 'First Class') => {
        switch(cat) {
            case 'T20': return [Format.T20];
            case 'List A': return [Format.ODI];
            case 'First Class': return [Format.SHIELD];
        }
    };

    useEffect(() => {
        const formats = getFormatsForCategory(category);
        if (!formats.includes(selectedFormatOption as Format) && !['All_T20', 'All_ListA', 'All_FC', 'Overall'].includes(selectedFormatOption)) {
            setSelectedFormatOption(formats[0]);
        }
    }, [category]);

    const allPlayersWithStats = useMemo(() => {
        return gameData.allPlayers.map(p => {
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            let stats: PlayerStats;

            if (selectedFormatOption === 'Overall') {
                stats = aggregateStats(p, Object.values(Format));
            } else if (selectedFormatOption === 'All_T20') {
                stats = aggregateStats(p, [Format.T20]);
            } else if (selectedFormatOption === 'All_ListA') {
                stats = aggregateStats(p, [Format.ODI]);
            } else if (selectedFormatOption === 'All_FC') {
                stats = aggregateStats(p, [Format.SHIELD]);
            } else {
                stats = p.stats[selectedFormatOption as Format];
            }

            return { ...p, teamName: team?.name || 'Free Agent', displayStats: stats };
        }).filter(p => p.displayStats.matches > 0);
    }, [gameData, selectedFormatOption]);

    const requestSort = (key: string) => {
        let direction = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        } else if (sortConfig.key !== key && ['average', 'bowlingAverage', 'economy'].includes(key)) {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatTypeChange = (type: 'batting' | 'bowling' | 'milestones' | 'phase') => {
        setStatType(type);
        if (type === 'batting' || type === 'phase') {
            setSortConfig({ key: 'runs', direction: 'descending' });
        } else if (type === 'bowling') {
            setSortConfig({ key: 'wickets', direction: 'descending' });
        }
    };
    
    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const sortedPlayers = useMemo(() => {
        if (statType === 'milestones') return [];

        let sortablePlayers = [...allPlayersWithStats];

        sortablePlayers.sort((a, b) => {
            if (sortConfig.key === 'name') {
                 if (a.name < b.name) return sortConfig.direction === 'ascending' ? -1 : 1;
                 if (a.name > b.name) return sortConfig.direction === 'ascending' ? 1 : -1;
                 return 0;
            }

            const aStat = a.displayStats;
            const bStat = b.displayStats;
            
            if (sortConfig.key === 'bestBowling') {
                if (aStat.bestBowling === '-') return 1;
                if (bStat.bestBowling === '-') return -1;
                const [aWickets, aRuns] = aStat.bestBowling.split('/').map(Number);
                const [bWickets, bRuns] = bStat.bestBowling.split('/').map(Number);

                if (aWickets !== bWickets) {
                    return sortConfig.direction === 'ascending' ? aWickets - bWickets : bWickets - aWickets;
                }
                return sortConfig.direction === 'ascending' ? bRuns - aRuns : aRuns - bRuns;
            }

            // @ts-ignore
            const valA = aStat[sortConfig.key];
            // @ts-ignore
            const valB = bStat[sortConfig.key];

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return sortablePlayers;
    }, [allPlayersWithStats, sortConfig, statType]);

    const sortedFastestFifties = useMemo(() => {
        return allPlayersWithStats
            .filter(p => p.displayStats.fastestFifty > 0)
            .sort((a,b) => a.displayStats.fastestFifty - b.displayStats.fastestFifty);
    }, [allPlayersWithStats]);

    const sortedFastestHundreds = useMemo(() => {
        return allPlayersWithStats
            .filter(p => p.displayStats.fastestHundred > 0)
            .sort((a,b) => a.displayStats.fastestHundred - b.displayStats.fastestHundred);
    }, [allPlayersWithStats]);

    const ThSortable = ({ label, sortKey }: { label: string, sortKey: string }) => (
        <th className="p-1 text-center cursor-pointer" onClick={() => requestSort(sortKey)}>
            {label}{getSortIndicator(sortKey)}
        </th>
    );

    const getCategoryLabel = (cat: string) => {
        if(cat === 'T20') return 'All T20s';
        if(cat === 'List A') return 'All List A';
        if(cat === 'First Class') return 'All First-Class';
        return '';
    }

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">Player Stats</h2>
            
            {/* Category Tabs */}
             <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2">
                {['T20', 'List A', 'First Class'].map((cat) => (
                    <button 
                        key={cat} 
                        onClick={() => setCategory(cat as any)} 
                        className={`px-4 py-2 text-sm font-semibold ${category === cat ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
             {/* Format/Aggregation Dropdown */}
            <div className="mb-2">
                <select
                    value={selectedFormatOption}
                    onChange={(e) => setSelectedFormatOption(e.target.value as StatFormatOption)}
                    className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium"
                >
                    <option value="Overall">Overall Career (All Formats)</option>
                    <option value={`All_${category.replace(' ', '')}`}>{getCategoryLabel(category)} (Combined)</option>
                    <option disabled>──────────</option>
                    {getFormatsForCategory(category).map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2 overflow-x-auto">
                <button onClick={() => handleStatTypeChange('batting')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'batting' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Batting</button>
                <button onClick={() => handleStatTypeChange('bowling')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'bowling' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Bowling</button>
                <button onClick={() => handleStatTypeChange('phase')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'phase' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Phases</button>
                <button onClick={() => handleStatTypeChange('milestones')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'milestones' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Milestones</button>
            </div>
            <div className="flex-grow overflow-y-auto">
                {statType === 'batting' || statType === 'bowling' ? (
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]">
                            <th className="p-1 cursor-pointer" onClick={() => requestSort('name')}>Player{getSortIndicator('name')}</th>
                            {statType === 'batting' ? <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Runs" sortKey="runs" />
                                <ThSortable label="Avg" sortKey="average" />
                                <ThSortable label="SR" sortKey="strikeRate" />
                                <ThSortable label="HS" sortKey="highestScore" />
                            </> : <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Wkts" sortKey="wickets" />
                                <ThSortable label="Avg" sortKey="bowlingAverage" />
                                <ThSortable label="Econ" sortKey="economy" />
                                <ThSortable label="Best" sortKey="bestBowling" />
                            </>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlayers.slice(0, 50).map(p => (
                        <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                            <td className="p-1 font-semibold">
                                {p.name}
                                <br />
                                <span className="text-xs font-normal text-gray-500">{p.teamName}</span>
                            </td>
                            {statType === 'batting' ? <>
                                <td className="p-1 text-center">{p.displayStats.matches}</td>
                                <td className="p-1 text-center font-bold">{p.displayStats.runs}</td>
                                <td className="p-1 text-center">{p.displayStats.average.toFixed(2)}</td>
                                <td className="p-1 text-center">{p.displayStats.strikeRate.toFixed(2)}</td>
                                <td className="p-1 text-center">{p.displayStats.highestScore}</td>
                            </> : <>
                                <td className="p-1 text-center">{p.displayStats.matches}</td>
                                <td className="p-1 text-center font-bold">{p.displayStats.wickets}</td>
                                <td className="p-1 text-center">{p.displayStats.bowlingAverage.toFixed(2)}</td>
                                <td className="p-1 text-center">{p.displayStats.economy.toFixed(2)}</td>
                                <td className="p-1 text-center">{p.displayStats.bestBowling}</td>
                            </>}
                        </tr>
                    ))}
                    </tbody>
                </table>
                ) : statType === 'phase' ? (
                    <div className="space-y-4 p-2">
                        {sortedPlayers.slice(0, 50).map(p => {
                            const ps = p.displayStats.phaseStats;
                            if (!ps) return null;
                            const b = ps.batting;
                            const bl = ps.bowling;
                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{p.name}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase">{p.teamName}</p>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black text-white ${p.role === 'BT' ? 'bg-blue-600' : p.role === 'BL' ? 'bg-red-600' : 'bg-amber-600'}`}>{p.role}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Powerplay</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.pp.runs}</span>/{b.pp.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.pp.wickets}</span>/{bl.pp.runsConceded}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Middle</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.mo.runs}</span>/{b.mo.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.mo.wickets}</span>/{bl.mo.runsConceded}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Death</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.do.runs}</span>/{b.do.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.do.wickets}</span>/{bl.do.runsConceded}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-center">Fastest Fifties</h3>
                             <table className="w-full text-sm">
                                <thead><tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]"><th className="p-1">Player</th><th className="p-1 text-center">Record</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedFastestFifties.slice(0, 25).map(p => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <td className="p-1 font-semibold">{p.name}<br /><span className="text-xs font-normal text-gray-500">{p.teamName}</span></td>
                                        <td className="p-1 text-center font-bold">{p.displayStats.fastestFifty} balls</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                         <div>
                            <h3 className="font-bold text-lg mb-2 text-center">Fastest Hundreds</h3>
                             <table className="w-full text-sm">
                                <thead><tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]"><th className="p-1">Player</th><th className="p-1 text-center">Record</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedFastestHundreds.slice(0, 25).map(p => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <td className="p-1 font-semibold">{p.name}<br /><span className="text-xs font-normal text-gray-500">{p.teamName}</span></td>
                                        <td className="p-1 text-center font-bold">{p.displayStats.fastestHundred} balls</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};

export default Stats;
