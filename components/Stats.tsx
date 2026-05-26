import React, { useState, useMemo, useEffect } from 'react';
import { GameData, Format, Player, PlayerStats } from '../types';
import { aggregateStats } from '../utils';
import { generateSingleFormatInitialStats } from '../data';

interface StatsProps {
    gameData: GameData;
    viewPlayerProfile: (player: Player, format: Format) => void;
}

type StatFormatOption = Format | 'All_T20' | 'All_ListA' | 'All_FC' | 'Overall';

const Stats: React.FC<StatsProps> = ({ gameData, viewPlayerProfile }) => {
    const [statType, setStatType] = useState<'batting' | 'bowling' | 'milestones' | 'phase'>('batting');
    const [phaseSubtype, setPhaseSubtype] = useState<'batting' | 'bowling'>('batting');
    const [careerOrSeason, setCareerOrSeason] = useState<'career' | 'season'>('season');
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
        const seasonNum = gameData.currentSeason;
        return gameData.allPlayers.map(p => {
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            let stats: PlayerStats;

            if (careerOrSeason === 'career') {
                if (selectedFormatOption === 'Overall') {
                    stats = aggregateStats(p, Object.values(Format));
                } else if (selectedFormatOption === 'All_T20') {
                    stats = aggregateStats(p, [Format.T20]);
                } else if (selectedFormatOption === 'All_ListA') {
                    stats = aggregateStats(p, [Format.ODI]);
                } else if (selectedFormatOption === 'All_FC') {
                    stats = aggregateStats(p, [Format.SHIELD]);
                } else {
                    stats = p.stats[selectedFormatOption as Format] || generateSingleFormatInitialStats();
                }
            } else {
                // Season stats
                if (selectedFormatOption === 'Overall') {
                    stats = aggregateStats(p, Object.values(Format), seasonNum);
                } else if (selectedFormatOption === 'All_T20') {
                    stats = aggregateStats(p, [Format.T20], seasonNum);
                } else if (selectedFormatOption === 'All_ListA') {
                    stats = aggregateStats(p, [Format.ODI], seasonNum);
                } else if (selectedFormatOption === 'All_FC') {
                    stats = aggregateStats(p, [Format.SHIELD], seasonNum);
                } else {
                    stats = p.seasonStats?.[seasonNum]?.[selectedFormatOption as Format] || generateSingleFormatInitialStats();
                }
            }

            // Fallbacks for sub-attributes
            const pb = stats.phaseStats?.batting || { pp: { runs: 0, balls: 0, dismissals: 0 }, mo: { runs: 0, balls: 0, dismissals: 0 }, do: { runs: 0, balls: 0, dismissals: 0 } };
            const pw = stats.phaseStats?.bowling || { pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 }, mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 }, do: { wickets: 0, runsConceded: 0, ballsBowled: 0 } };

            return { 
                ...p, 
                teamName: team?.name || 'Free Agent', 
                displayStats: {
                    ...stats,
                    phaseBattingPpRuns: pb.pp?.runs || 0,
                    phaseBattingMoRuns: pb.mo?.runs || 0,
                    phaseBattingDoRuns: pb.do?.runs || 0,
                    phaseBowlingPpWickets: pw.pp?.wickets || 0,
                    phaseBowlingMoWickets: pw.mo?.wickets || 0,
                    phaseBowlingDoWickets: pw.do?.wickets || 0,
                    // safe values for other milestone/best bowling sorts
                    thirties: stats.thirties || 0,
                    fifties: stats.fifties || 0,
                    hundreds: stats.hundreds || 0,
                    bestBowlingWickets: stats.bestBowlingWickets || 0,
                    bestBowlingRuns: stats.bestBowlingRuns || 999,
                } 
            };
        }).filter(p => p.displayStats.matches > 0);
    }, [gameData, selectedFormatOption, careerOrSeason]);

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
        if (type === 'batting') {
            setSortConfig({ key: 'runs', direction: 'descending' });
        } else if (type === 'bowling') {
            setSortConfig({ key: 'wickets', direction: 'descending' });
        } else if (type === 'phase') {
            setSortConfig({ key: phaseSubtype === 'batting' ? 'phaseBattingPpRuns' : 'phaseBowlingPpWickets', direction: 'descending' });
        }
    };

    const handlePhaseSubtypeChange = (sub: 'batting' | 'bowling') => {
        setPhaseSubtype(sub);
        setSortConfig({ key: sub === 'batting' ? 'phaseBattingPpRuns' : 'phaseBowlingPpWickets', direction: 'descending' });
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
                if (!aStat.bestBowling || aStat.bestBowling === '-') return 1;
                if (!bStat.bestBowling || bStat.bestBowling === '-') return -1;
                const [aWkts, aRns] = aStat.bestBowling.split('/').map(Number);
                const [bWkts, bRns] = bStat.bestBowling.split('/').map(Number);

                if (aWkts !== bWkts) {
                    return sortConfig.direction === 'ascending' ? aWkts - bWkts : bWkts - aWkts;
                }
                return sortConfig.direction === 'ascending' ? bRns - aRns : aRns - bRns;
            }

            // @ts-ignore
            const valA = aStat[sortConfig.key] ?? 0;
            // @ts-ignore
            const valB = bStat[sortConfig.key] ?? 0;

            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortablePlayers;
    }, [allPlayersWithStats, sortConfig, statType, phaseSubtype]);

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

    const ThSortable = ({ label, sortKey, className = "p-2 text-center" }: { label: string, sortKey: string, className?: string }) => (
        <th className={`${className} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-[0.05em] text-[10px] font-bold`} onClick={() => requestSort(sortKey)}>
            <div className="flex items-center justify-center gap-0.5">
                <span>{label}</span>
                <span className="text-[9px] text-teal-500">{getSortIndicator(sortKey)}</span>
            </div>
        </th>
    );

    const getCategoryLabel = (cat: string) => {
        if(cat === 'T20') return 'All T20s';
        if(cat === 'List A') return 'All List A';
        if(cat === 'First Class') return 'All First-Class';
        return '';
    }

    return (
        <div className="p-4 h-[calc(100vh-90px)] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 font-sans">
            
            {/* Header with Title and Season Segment Switcher */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 dark:border-gray-800 pb-3 mb-4 gap-3">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Player Statistics</h2>
                    <p className="text-gray-500 text-xs">Examine leagues, divisions, milestones and in-depth match phases.</p>
                </div>
                
                {/* Segment Switcher toggling Career/Season View */}
                <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl self-start md:self-auto shadow-sm border border-slate-300/40 dark:border-slate-800/40">
                    <button 
                        onClick={() => setCareerOrSeason('season')} 
                        className={`px-4 py-2 text-xs font-extrabold uppercase rounded-lg transition-all ${careerOrSeason === 'season' ? 'bg-teal-500 text-slate-950 shadow-md font-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        Season {gameData.currentSeason}
                    </button>
                    <button 
                        onClick={() => setCareerOrSeason('career')} 
                        className={`px-4 py-2 text-xs font-extrabold uppercase rounded-lg transition-all ${careerOrSeason === 'career' ? 'bg-teal-500 text-slate-950 shadow-md font-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        Career Career
                    </button>
                </div>
            </header>
            
            {/* Category Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800">
                {['T20', 'List A', 'First Class'].map((cat) => (
                    <button 
                        key={cat} 
                        onClick={() => setCategory(cat as any)} 
                        className={`flex-1 py-2.5 text-xs font-extrabold uppercase rounded-xl transition-all ${category === cat ? 'bg-white dark:bg-slate-800 text-teal-500 dark:text-teal-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50' : 'text-gray-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            {/* Format Dropdown selection */}
            <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Target Scope</label>
                <select
                    value={selectedFormatOption}
                    onChange={(e) => setSelectedFormatOption(e.target.value as StatFormatOption)}
                    className="w-full text-xs font-semibold p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                    <option value="Overall">Overall Combined formats {careerOrSeason === 'season' ? `(Season ${gameData.currentSeason})` : '(Career)'}</option>
                    <option value={`All_${category.replace(' ', '')}`}>{getCategoryLabel(category)} (Format Group Aggregate)</option>
                    <option disabled>────────── FORMAT FIXTURES ──────────</option>
                    {getFormatsForCategory(category).map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            </div>

            {/* Subtabs (Batting, Bowling, Phases, Milestones) */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 mb-3 overflow-x-auto select-none no-scrollbar">
                <button onClick={() => handleStatTypeChange('batting')} className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${statType === 'batting' ? 'border-teal-500 text-teal-500 dark:text-teal-400 font-black' : 'border-transparent text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Batting</button>
                <button onClick={() => handleStatTypeChange('bowling')} className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${statType === 'bowling' ? 'border-teal-500 text-teal-500 dark:text-teal-400 font-black' : 'border-transparent text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Bowling</button>
                <button onClick={() => handleStatTypeChange('phase')} className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${statType === 'phase' ? 'border-teal-500 text-teal-500 dark:text-teal-400 font-black' : 'border-transparent text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Phases</button>
                <button onClick={() => handleStatTypeChange('milestones')} className={`px-4 py-3 font-extrabold text-xs uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${statType === 'milestones' ? 'border-teal-500 text-teal-500 dark:text-teal-400 font-black' : 'border-transparent text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Milestones</button>
            </div>

            {/* Primary Content Scroll Arena */}
            <div className="flex-grow overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm relative no-scrollbar">
                
                {/* BATTING & BOWLING TABULAR GRID */}
                {statType === 'batting' || statType === 'bowling' ? (
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none z-10">
                            <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-[0.05em] text-[10px] font-bold" onClick={() => requestSort('name')}>Player {getSortIndicator('name')}</th>
                            {statType === 'batting' ? <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Runs" sortKey="runs" />
                                <ThSortable label="Avg" sortKey="average" />
                                <ThSortable label="SR" sortKey="strikeRate" />
                                <ThSortable label="HS" sortKey="highestScore" />
                                <ThSortable label="30s" sortKey="thirties" />
                                <ThSortable label="50s" sortKey="fifties" />
                                <ThSortable label="100s" sortKey="hundreds" />
                            </> : <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Wkts" sortKey="wickets" />
                                <ThSortable label="Avg" sortKey="bowlingAverage" />
                                <ThSortable label="Econ" sortKey="economy" />
                                <ThSortable label="Best" sortKey="bestBowling" />
                                <ThSortable label="3W" sortKey="threeWicketHauls" />
                                <ThSortable label="5W" sortKey="fiveWicketHauls" />
                            </>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                    {sortedPlayers.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400 italic font-mono">No stats registered in this context.</td>
                        </tr>
                    ) : sortedPlayers.slice(0, 50).map(p => (
                        <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-teal-50/20 dark:hover:bg-teal-950/20 transition-all">
                            <td className="p-3 font-semibold dark:text-white border-r border-slate-100 dark:border-slate-800 max-w-[150px] truncate">
                                <div>{p.name}</div>
                                <div className="text-[10px] font-normal text-teal-600 dark:text-teal-400 uppercase tracking-tighter mt-0.5">{p.teamName}</div>
                            </td>
                            {statType === 'batting' ? <>
                                <td className="p-3 text-center">{p.displayStats.matches}</td>
                                <td className="p-3 text-center font-black text-teal-600 dark:text-teal-400 text-sm">{p.displayStats.runs}</td>
                                <td className="p-3 text-center font-mono">{Number(p.displayStats.average).toFixed(2)}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{Number(p.displayStats.strikeRate).toFixed(1)}</td>
                                <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{p.displayStats.highestScore}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{p.displayStats.thirties}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{p.displayStats.fifties}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{p.displayStats.hundreds}</td>
                            </> : <>
                                <td className="p-3 text-center">{p.displayStats.matches}</td>
                                <td className="p-3 text-center font-black text-teal-600 dark:text-teal-400 text-sm">{p.displayStats.wickets}</td>
                                <td className="p-3 text-center font-mono">{Number(p.displayStats.bowlingAverage).toFixed(2)}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{Number(p.displayStats.economy).toFixed(2)}</td>
                                <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">{p.displayStats.bestBowling || '-'}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{p.displayStats.threeWicketHauls}</td>
                                <td className="p-3 text-center font-mono text-slate-500">{p.displayStats.fiveWicketHauls}</td>
                            </>}
                        </tr>
                    ))}
                    </tbody>
                </table>
                ) : statType === 'phase' ? (
                
                /* NORMALIZED, HIGH-POLISH PHASE STATS ARE RENDERED AS A TABULAR COMPARISON ELEMENT */
                <div className="flex flex-col h-full">
                    {/* Inner segmented selector for Batting Phases vs Bowling Phases */}
                    <div className="flex p-2 bg-slate-50 dark:bg-slate-800/55 border-b border-slate-200 dark:border-slate-800 gap-1 z-10 sticky top-0">
                        <button 
                            onClick={() => handlePhaseSubtypeChange('batting')} 
                            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all ${phaseSubtype === 'batting' ? 'bg-teal-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            🏏 Batting Phases (Runs/Outs)
                        </button>
                        <button 
                            onClick={() => handlePhaseSubtypeChange('bowling')} 
                            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg transition-all ${phaseSubtype === 'bowling' ? 'bg-teal-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            ⚡ Bowling Phases (Wickets/Runs)
                        </button>
                    </div>

                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none sticky top-[37px] z-10">
                                <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-[0.05em] text-[10px] font-bold" onClick={() => requestSort('name')}>Player {getSortIndicator('name')}</th>
                                <ThSortable label="M" sortKey="matches" />
                                {phaseSubtype === 'batting' ? <>
                                    <ThSortable label="PP Runs" sortKey="phaseBattingPpRuns" />
                                    <ThSortable label="MO Runs" sortKey="phaseBattingMoRuns" />
                                    <ThSortable label="DO Runs" sortKey="phaseBattingDoRuns" />
                                    <ThSortable label="Agg Runs" sortKey="runs" />
                                </> : <>
                                    <ThSortable label="PP Wkts" sortKey="phaseBowlingPpWickets" />
                                    <ThSortable label="MO Wkts" sortKey="phaseBowlingMoWickets" />
                                    <ThSortable label="DO Wkts" sortKey="phaseBowlingDoWickets" />
                                    <ThSortable label="Agg Wkts" sortKey="wickets" />
                                </>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                        {sortedPlayers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 italic font-mono">No phase records found in this scope.</td>
                            </tr>
                        ) : sortedPlayers.slice(0, 50).map(p => {
                            const ps = p.displayStats;
                            const pb = ps.phaseStats?.batting || { pp: { runs: 0, dismissals: 0 }, mo: { runs: 0, dismissals: 0 }, do: { runs: 0, dismissals: 0 } };
                            const pw = ps.phaseStats?.bowling || { pp: { wickets: 0, runsConceded: 0 }, mo: { wickets: 0, runsConceded: 0 }, do: { wickets: 0, runsConceded: 0 } };

                            return (
                                <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-teal-50/20 dark:hover:bg-teal-950/20 transition-all">
                                    <td className="p-3 font-semibold dark:text-white border-r border-slate-100 dark:border-slate-800">
                                        <div>{p.name}</div>
                                        <div className="text-[9px] font-normal text-slate-500 uppercase tracking-tighter">{p.teamName}</div>
                                    </td>
                                    <td className="p-3 text-center">{ps.matches}</td>
                                    {phaseSubtype === 'batting' ? <>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{pb.pp?.runs || 0}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">/{pb.pp?.dismissals || 0}</span>
                                        </td>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{pb.mo?.runs || 0}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">/{pb.mo?.dismissals || 0}</span>
                                        </td>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{pb.do?.runs || 0}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">/{pb.do?.dismissals || 0}</span>
                                        </td>
                                        <td className="p-3 text-center font-black text-teal-600 dark:text-teal-400">{ps.runs}</td>
                                    </> : <>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{pw.pp?.wickets || 0}</span>
                                            <span className="text-[9px] text-slate-400 font-mono"> ({pw.pp?.runsConceded || 0}r)</span>
                                        </td>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{pw.mo?.wickets || 0}</span>
                                            <span className="text-[9px] text-slate-400 font-mono"> ({pw.mo?.runsConceded || 0}r)</span>
                                        </td>
                                        <td className="p-3 text-center border-r border-slate-100 dark:border-slate-800/40">
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{pw.do?.wickets || 0}</span>
                                            <span className="text-[9px] text-slate-400 font-mono"> ({pw.do?.runsConceded || 0}r)</span>
                                        </td>
                                        <td className="p-3 text-center font-black text-cyan-500 dark:text-cyan-400">{ps.wickets}</td>
                                    </>}
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                ) : (
                
                 /* MILESTONES (FASTEST 50s & FASTEST 100s) */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        {/* Fastest Fifties */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-black text-sm uppercase tracking-wider mb-3 text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                                <span>🏏</span> Fastest Fifties
                            </h3>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left bg-slate-200/50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none">
                                        <th className="p-2 uppercase text-[9px] font-bold">Player</th>
                                        <th className="p-2 text-center uppercase text-[9px] font-bold">Balls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sortedFastestFifties.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="p-4 text-center text-slate-400 italic font-mono">No fifties found.</td>
                                    </tr>
                                ) : sortedFastestFifties.slice(0, 15).map((p, idx) => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-2 font-semibold">
                                            <span className="text-[10px] text-slate-400 font-mono mr-1">#{idx+1}</span>
                                            {p.name}
                                            <div className="text-[9px] font-normal text-slate-500 uppercase">{p.teamName}</div>
                                        </td>
                                        <td className="p-2 text-center font-black text-teal-600 dark:text-teal-400 text-sm">{p.displayStats.fastestFifty}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                         {/* Fastest Hundreds */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="font-black text-sm uppercase tracking-wider mb-3 text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                                <span>🏆</span> Fastest Hundreds
                            </h3>
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left bg-slate-200/50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 select-none">
                                        <th className="p-2 uppercase text-[9px] font-bold">Player</th>
                                        <th className="p-2 text-center uppercase text-[9px] font-bold">Balls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {sortedFastestHundreds.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="p-4 text-center text-slate-400 italic font-mono">No hundreds found.</td>
                                    </tr>
                                ) : sortedFastestHundreds.slice(0, 15).map((p, idx) => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-2 font-semibold">
                                            <span className="text-[10px] text-slate-400 font-mono mr-1">#{idx+1}</span>
                                            {p.name}
                                            <div className="text-[9px] font-normal text-slate-500 uppercase">{p.teamName}</div>
                                        </td>
                                        <td className="p-2 text-center font-black text-teal-600 dark:text-teal-400 text-sm">{p.displayStats.fastestHundred}</td>
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
