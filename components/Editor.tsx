
import React, { useState, useCallback } from 'react';
import { GameData, Player, PlayerRole, Format, BattingStyle, ScoreLimits, Ground } from '../types';
import { getBatterTier, BATTING_PROFILES, getRoleColor, getRoleFullName, getBattingStyleLabel, BATTING_STYLE_OPTIONS } from '../utils';
import { PITCH_TYPES, generateInitialStats } from '../data';

interface EditorProps {
    gameData: GameData;
    handleUpdatePlayer: (player: Player) => void;
    handleCreatePlayer: (player: Player) => void;
    handleUpdateGround: (code: string, updates: Partial<Ground> | string) => void;
    handleUpdateScoreLimits: (groundCode: string, format: Format, field: keyof ScoreLimits, value: any, inning: number) => void;
}

const Editor: React.FC<EditorProps> = ({ gameData, handleUpdatePlayer, handleCreatePlayer, handleUpdateGround, handleUpdateScoreLimits }) => {
    const [editType, setEditType] = useState<'players' | 'grounds' | 'rules'>('players');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editorFormatTab, setEditorFormatTab] = useState<Format>(Format.T20);

    const getPlayerProfileForFormat = useCallback((player: Player, format: Format) => {
        const custom = player.customProfiles?.[format];
        if (custom && custom.avg > 0 && custom.sr > 0) {
            return custom;
        }
        const tier = getBatterTier(player.battingSkill);
        const style = player.style;
        // @ts-ignore
        return BATTING_PROFILES[format][tier][style] || BATTING_PROFILES[format][tier]['N'];
    }, []);

    const handleProfileChange = (field: 'avg' | 'sr', value: string) => {
        if (!selectedPlayer) return;
        const numericValue = value ? parseFloat(value) : 0;
        if (isNaN(numericValue)) return;

        setSelectedPlayer(prev => {
            if (!prev) return null;
            const newProfiles = { ...(prev.customProfiles || {}) };
            const newFormatProfile = { avg: 0, sr: 0, ...(newProfiles[editorFormatTab] || {}) };
            newFormatProfile[field] = numericValue;

            if (newFormatProfile.avg <= 0 && newFormatProfile.sr <= 0) {
                delete newProfiles[editorFormatTab];
            } else {
                newProfiles[editorFormatTab] = newFormatProfile;
            }

            if (Object.keys(newProfiles).length === 0) {
                const updatedPlayer = {...prev};
                delete updatedPlayer.customProfiles;
                return updatedPlayer;
            }
            return { ...prev, customProfiles: newProfiles };
        });
    };

    const handleSelectPlayer = (playerId: string) => {
        setIsCreating(false);
        setSelectedPlayer(gameData.allPlayers.find(p => p.id === playerId) || null);
    };

    const handleAddNewPlayer = () => {
        setIsCreating(true);
        setSelectedPlayer({
            id: `new-player-${Date.now()}`,
            name: '',
            nationality: 'Local',
            role: PlayerRole.BATSMAN,
            battingSkill: 50,
            secondarySkill: 10,
            style: 'N',
            isOpener: false,
            isForeign: false,
            stats: generateInitialStats()
        });
    }

    const savePlayer = () => {
        if (!selectedPlayer) return;
        if (isCreating) {
            handleCreatePlayer(selectedPlayer);
        } else {
            handleUpdatePlayer(selectedPlayer);
        }
        setSelectedPlayer(null);
        setIsCreating(false);
    }

    const handleGroundChange = (code: string, field: keyof Ground, value: any) => {
        if (field === 'pitch') {
            // Maintain backward compatibility if the function expects a string for pitch only
            // But prefer object update
            handleUpdateGround(code, { pitch: value });
        } else {
            handleUpdateGround(code, { [field]: value });
        }
    };

    const renderPlayerEditor = () => {
        if (!selectedPlayer) return null;
        const defaultProfile = getPlayerProfileForFormat(selectedPlayer, editorFormatTab);
        const customAvg = selectedPlayer.customProfiles?.[editorFormatTab]?.avg;
        const customSR = selectedPlayer.customProfiles?.[editorFormatTab]?.sr;

        return (
            <div className="p-4 space-y-2">
                 <h2 className="text-xl font-bold text-center mb-2">{isCreating ? 'Create Player' : 'Edit Player'}</h2>
                 <input type="text" value={selectedPlayer.name} onChange={e => setSelectedPlayer({...selectedPlayer, name: e.target.value})} placeholder="Name" className="w-full p-2 rounded bg-white dark:bg-gray-800" />
                 <select value={selectedPlayer.role} onChange={e => setSelectedPlayer({...selectedPlayer, role: e.target.value as PlayerRole})} className="w-full p-2 rounded bg-white dark:bg-gray-800">
                    {Object.values(PlayerRole).map(r => <option key={r} value={r}>{getRoleFullName(r)}</option>)}
                 </select>
                <select value={selectedPlayer.style} onChange={e => setSelectedPlayer({...selectedPlayer, style: e.target.value as BattingStyle})} className="w-full p-2 rounded bg-white dark:bg-gray-800">
                    {BATTING_STYLE_OPTIONS.map(s => <option key={s} value={s}>{getBattingStyleLabel(s)}</option>)}
                 </select>
                 <div className="flex items-center space-x-2"><span>Batting</span><input type="range" min="1" max="99" value={selectedPlayer.battingSkill} onChange={e => setSelectedPlayer({...selectedPlayer, battingSkill: +e.target.value})} className="w-full" /><span>{selectedPlayer.battingSkill}</span></div>
                 <div className="flex items-center space-x-2"><span>Bowling</span><input type="range" min="1" max="99" value={selectedPlayer.secondarySkill} onChange={e => setSelectedPlayer({...selectedPlayer, secondarySkill: +e.target.value})} className="w-full" /><span>{selectedPlayer.secondarySkill}</span></div>
                 <div className="flex items-center justify-between"><label>Is Opener?</label><input type="checkbox" checked={selectedPlayer.isOpener} onChange={e => setSelectedPlayer({...selectedPlayer, isOpener: e.target.checked})} className="h-5 w-5" /></div>
                 <div className="flex items-center justify-between"><label>Is Foreign?</label><input type="checkbox" checked={selectedPlayer.isForeign} onChange={e => setSelectedPlayer({...selectedPlayer, isForeign: e.target.checked})} className="h-5 w-5" /></div>
                 <div className="border-t border-gray-300 dark:border-gray-700 pt-2 mt-3">
                    <p className="text-center font-semibold text-sm mb-1">Custom Batting Profile</p>
                    <div className="flex justify-center overflow-x-auto border-b border-gray-300 dark:border-gray-700 mb-2 pb-2">
                        {Object.values(Format).map(f => (
                            <button key={f} onClick={() => setEditorFormatTab(f)} className={`px-3 py-1 text-xs font-semibold whitespace-nowrap ${editorFormatTab === f ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>{f}</button>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                        <span>Target Avg</span>
                        <input type="number" value={customAvg || ''} onChange={e => handleProfileChange('avg', e.target.value)} placeholder={`Default: ${defaultProfile.avg}`} className="w-full p-1 rounded bg-white dark:bg-gray-800" />
                    </div>
                    <div className="flex items-center space-x-2 text-sm mt-1">
                        <span>Target SR</span>
                        <input type="number" value={customSR || ''} onChange={e => handleProfileChange('sr', e.target.value)} placeholder={`Default: ${defaultProfile.sr}`} className="w-full p-1 rounded bg-white dark:bg-gray-800" />
                    </div>
                 </div>
                 <div className="flex pt-4 space-x-2">
                     <button onClick={savePlayer} className="flex-grow bg-green-500 text-white p-2 rounded">Save</button>
                     <button onClick={() => setSelectedPlayer(null)} className="flex-grow bg-gray-500 text-white p-2 rounded">Cancel</button>
                 </div>
            </div>
        );
    }

    if (selectedPlayer) return renderPlayerEditor();

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">Game Editor</h2>
            <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2">
                <button onClick={() => setEditType('players')} className={`px-4 py-2 font-semibold ${editType === 'players' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Players</button>
                <button onClick={() => setEditType('grounds')} className={`px-4 py-2 font-semibold ${editType === 'grounds' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Grounds</button>
                <button onClick={() => setEditType('rules')} className={`px-4 py-2 font-semibold ${editType === 'rules' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Rules</button>
            </div>

            {editType === 'players' && (
                <div className="flex-grow overflow-y-auto">
                    <button onClick={handleAddNewPlayer} className="w-full bg-green-500 text-white p-2 rounded mb-2">Add New Player</button>
                    <ul className="space-y-1">
                    {gameData.allPlayers.map(p => (
                        <li key={p.id} onClick={() => handleSelectPlayer(p.id)} className="flex items-center bg-gray-100 dark:bg-gray-800/50 p-2 rounded-md cursor-pointer">
                            <span className={`font-bold w-8 text-sm ${getRoleColor(p.role)}`}>{p.role}</span>
                            <span className="flex-grow">{p.name} {p.isForeign ? '(F)' : ''}</span>
                            <span className="font-semibold">{p.battingSkill}</span>
                        </li>
                    ))}
                    </ul>
                </div>
            )}

            {editType === 'grounds' && (
                 <div className="space-y-4 overflow-y-auto pb-20">
                    {gameData.grounds.map(g => (
                        <div key={g.code} className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-bold text-lg">{g.name}</p>
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{g.code}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Pitch Type</label>
                                    <select value={g.pitch} onChange={e => handleGroundChange(g.code, 'pitch', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm">
                                        {PITCH_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Weather</label>
                                        <select value={g.weather || 'Sunny'} onChange={e => handleGroundChange(g.code, 'weather', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm">
                                            {['Sunny', 'Overcast', 'Rainy', 'Humid', 'Dry'].map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Outfield</label>
                                        <select value={g.outfieldSpeed || 'Medium'} onChange={e => handleGroundChange(g.code, 'outfieldSpeed', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm">
                                            {['Fast', 'Medium', 'Slow', 'Lightning'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Boundaries</label>
                                        <select value={g.boundarySize || 'Medium'} onChange={e => handleGroundChange(g.code, 'boundarySize', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm">
                                            {['Small', 'Medium', 'Large'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Dimensions</label>
                                        <input type="text" value={g.dimensions || ''} onChange={e => handleGroundChange(g.code, 'dimensions', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm" placeholder="e.g. 70m / 65m" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            )}

             {editType === 'rules' && (
                 <div className="space-y-3 overflow-y-auto">
                    {gameData.grounds.map(g => (
                        <div key={g.code} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md">
                            <p className="font-bold mb-2">{g.name}</p>
                            {Object.values(Format).map(format => (
                                <div key={format} className="mb-2 last:mb-0">
                                    <p className="font-semibold text-sm">{format}</p>
                                    {(format === Format.SHIELD ? [1, 2, 3, 4] : [1, 2]).map(inning => (
                                        <div key={inning} className="pl-2 mt-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Inning {inning}</p>
                                            <div className="flex space-x-2 mt-1">
                                                <input 
                                                    type="number" 
                                                    placeholder="Max Runs"
                                                    value={gameData.scoreLimits?.[g.code]?.[format]?.[inning]?.maxRuns || ''}
                                                    onChange={(e) => handleUpdateScoreLimits(g.code, format, 'maxRuns', e.target.value, inning)}
                                                    className="w-1/2 p-1 rounded bg-white dark:bg-gray-900 text-sm"
                                                />
                                                <input 
                                                    type="number"
                                                    placeholder="Max Wkts"
                                                    value={gameData.scoreLimits?.[g.code]?.[format]?.[inning]?.maxWickets || ''}
                                                    onChange={(e) => handleUpdateScoreLimits(g.code, format, 'maxWickets', e.target.value, inning)}
                                                    className="w-1/2 p-1 rounded bg-white dark:bg-gray-900 text-sm"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
};

export default Editor;