import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Match, GameData, MatchResult, Team, Player, Inning, BattingPerformance, BowlingPerformance } from '../types';
import { getPlayerById, formatOvers } from '../utils';

interface Gameplay2DScreenProps {
    match: Match;
    gameData: GameData;
    onMatchComplete: (result: MatchResult) => void;
    onExit: () => void;
}

// --- Constants ---
const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 650;
const CENTER_X = FIELD_WIDTH / 2;
const CENTER_Y = FIELD_HEIGHT / 2;
const PITCH_START_Y = 220;
const PITCH_END_Y = 460;
const BOUNDARY_RADIUS = 285;
const BALL_RADIUS = 3.5;
const FIELDER_RADIUS = 8;

type BallState = 'dead' | 'runup' | 'bowling' | 'hit' | 'fielding' | 'boundary' | 'wicket';
type Aggression = 'Defensive' | 'Balanced' | 'Attacking';

interface Fielder {
    id: string;
    x: number;
    y: number;
    role: 'keeper' | 'bowler' | 'fielder';
    speed: number;
    name: string;
}

export const Gameplay2DScreen: React.FC<Gameplay2DScreenProps> = ({ match, gameData, onMatchComplete, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    
    const [inningsState, setInningsState] = useState<Inning[]>([]);
    const [currentInningIndex, setCurrentInningIndex] = useState(0);
    const [battingTeam, setBattingTeam] = useState<Team | null>(null);
    const [bowlingTeam, setBowlingTeam] = useState<Team | null>(null);
    const [target, setTarget] = useState<number | null>(null);
    const [strikerId, setStrikerId] = useState<string>('');
    const [nonStrikerId, setNonStrikerId] = useState<string>('');
    const [bowlerId, setBowlerId] = useState<string>('');
    const [aggression, setAggression] = useState<Aggression>('Balanced');
    const [commentary, setCommentary] = useState<string[]>(["Match starting..."]);
    const [modalType, setModalType] = useState<'batter' | 'bowler' | 'openers' | null>(null);
    const [gameOver, setGameOver] = useState(false);
    const [ballPhase, setBallPhase] = useState<BallState>('dead');
    
    const [selectedModalId, setSelectedModalId] = useState('');
    const [selectedModalId2, setSelectedModalId2] = useState('');

    const game = useRef({
        ball: { x: CENTER_X, y: PITCH_START_Y, z: 0, vx: 0, vy: 0, vz: 0, state: 'dead' as BallState, bounces: 0 },
        bowlerPos: { x: CENTER_X, y: PITCH_START_Y - 30 },
        fielders: [] as Fielder[],
        draggedFielder: null as number | null,
        strikerId: '',
        nonStrikerId: '',
        bowlerId: '',
        aggression: 'Balanced' as Aggression,
        currentInningIndex: 0,
        target: null as number | null,
        gameOver: false,
        matchCompleteTriggered: false
    });

    useEffect(() => { game.current.strikerId = strikerId; }, [strikerId]);
    useEffect(() => { game.current.nonStrikerId = nonStrikerId; }, [nonStrikerId]);
    useEffect(() => { game.current.bowlerId = bowlerId; }, [bowlerId]);
    useEffect(() => { game.current.aggression = aggression; }, [aggression]);
    useEffect(() => { game.current.currentInningIndex = currentInningIndex; }, [currentInningIndex]);
    useEffect(() => { game.current.target = target; }, [target]);
    useEffect(() => { game.current.gameOver = gameOver; }, [gameOver]);

    useEffect(() => {
        const tA = gameData.teams.find(t => t.name === match.teamA) || gameData.teams[0];
        const tB = gameData.teams.find(t => t.name === match.teamB) || gameData.teams[1];
        
        const getXI = (t: Team) => {
            const xiIds = gameData.playingXIs[t.id]?.[gameData.currentFormat];
            if (xiIds && xiIds.length === 11) return xiIds.map(id => t.squad.find(p => p.id === id)).filter(Boolean) as Player[];
            return t.squad.slice(0, 11); 
        };

        const pA = getXI(tA);
        const pB = getXI(tB);
        setAllPlayers([...pA, ...pB]);

        const createInning = (team: Team, opp: Team, pList: Player[]): Inning => ({
            teamId: team.id, teamName: team.name, score: 0, wickets: 0, overs: '0.0', extras: 0,
            batting: pList.map(p => ({ 
                playerId: p.id, playerName: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalText: 'not out', dismissal: { type: 'not out', bowlerId: '' } 
            })),
            bowling: getXI(opp).map(p => ({ 
                playerId: p.id, playerName: p.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 
            })),
            recentBalls: []
        });

        setInningsState([ createInning(tA, tB, pA), createInning(tB, tA, pB) ]);
        setBattingTeam(tA);
        setBowlingTeam(tB);
        setModalType('openers');
    }, []);

    const resetBallPhase = useCallback((nextState: BallState = 'dead') => {
        game.current.ball.state = nextState;
        setBallPhase(nextState);
    }, []);

    const updateScore = useCallback((runs: number, wkt: number, balls: number = 1) => {
        setInningsState(prev => {
            const newInnings = [...prev];
            const inn = newInnings[game.current.currentInningIndex];
            inn.score += runs;
            inn.wickets += wkt;

            const batter = inn.batting.find(p => p.playerId === game.current.strikerId);
            const bowler = inn.bowling.find(p => p.playerId === game.current.bowlerId);

            if (batter) {
                batter.runs += runs;
                batter.balls += balls; 
                if (runs === 4) batter.fours++;
                if (runs === 6) batter.sixes++;
                if (wkt) { batter.isOut = true; batter.dismissalText = "b " + (bowler?.playerName || 'Bowler'); }
            }

            if (bowler) {
                bowler.runsConceded += runs;
                bowler.ballsBowled += balls;
                bowler.wickets += wkt;
                bowler.overs = formatOvers(bowler.ballsBowled);
            }

            const innBalls = inn.bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
            inn.overs = formatOvers(innBalls);
            
            const ballLabel = wkt ? 'W' : runs.toString();
            inn.recentBalls = [ballLabel, ...(inn.recentBalls || [])].slice(0, 12);
            
            return newInnings;
        });

        if (runs % 2 !== 0) {
            setStrikerId(prev => {
                const oldStriker = prev;
                const newStriker = game.current.nonStrikerId;
                setNonStrikerId(oldStriker);
                return newStriker;
            });
        }
    }, []);

    const determineShotOutcome = () => {
        const p = game.current;
        const batter = getPlayerById(p.strikerId, allPlayers);
        const bowler = getPlayerById(p.bowlerId, allPlayers);

        let batSkill = batter.battingSkill;
        let bowlSkill = bowler.secondarySkill;

        if (p.aggression === 'Attacking') batSkill += 12;
        if (p.aggression === 'Defensive') batSkill -= 15;
        
        const diff = batSkill - bowlSkill + (Math.random() * 60 - 30);
        p.ball.state = 'hit';
        p.ball.bounces = 0;

        if (diff < -40 && Math.random() < 0.2) {
            setCommentary(prev => ["OUT! BOWLED HIM!", ...prev]);
            updateScore(0, 1);
            p.ball.state = 'wicket';
            handleDismissal();
            return;
        }

        let power = 3.5 + Math.random() * 6.5;
        let lift = 0;
        if (p.aggression === 'Attacking') { power += 4; lift = Math.random() * 14; }
        if (diff > 30) power += 3.5;

        const angle = Math.random() * Math.PI * 2;
        p.ball.vx = Math.cos(angle) * power;
        p.ball.vy = Math.sin(angle) * power;
        p.ball.vz = lift;
    };

    const handleDismissal = () => {
        resetBallPhase('dead');
        const inn = inningsState[game.current.currentInningIndex];
        if (inn.wickets + 1 >= 10) return;

        if (battingTeam?.id === gameData.userTeamId) {
            setTimeout(() => setModalType('batter'), 1200);
        } else {
            setTimeout(() => {
                const next = inn.batting.find(b => !b.isOut && b.playerId !== game.current.strikerId && b.playerId !== game.current.nonStrikerId);
                if (next) {
                    setStrikerId(next.playerId);
                    setCommentary(prev => [`${next.playerName} is the new batter.`, ...prev]);
                }
            }, 1000);
        }
    };

    const processBall = () => {
        const p = game.current;
        if (p.ball.state === 'dead' || p.gameOver) return;

        if (p.ball.state === 'runup') {
            p.bowlerPos.y += 4.5;
            if (p.bowlerPos.y >= PITCH_START_Y) {
                p.ball.state = 'bowling';
                p.ball.x = p.bowlerPos.x;
                p.ball.y = p.bowlerPos.y;
                p.ball.vx = (Math.random() - 0.5) * 2;
                p.ball.vy = 10;
            }
        }
        else if (p.ball.state === 'bowling') {
            p.ball.x += p.ball.vx;
            p.ball.y += p.ball.vy;
            if (p.ball.y >= PITCH_END_Y - 8) determineShotOutcome();
        }
        else if (p.ball.state === 'hit') {
            p.ball.x += p.ball.vx;
            p.ball.y += p.ball.vy;
            p.ball.vx *= (p.ball.z <= 0 ? 0.98 : 0.99);
            p.ball.vy *= (p.ball.z <= 0 ? 0.98 : 0.99);

            if (p.ball.z > 0 || p.ball.vz > 0) {
                p.ball.z += p.ball.vz;
                p.ball.vz -= 0.38;
                if (p.ball.z < 0) {
                    p.ball.z = 0;
                    p.ball.vz = -p.ball.vz * 0.45;
                    p.ball.bounces++;
                }
            }

            const dist = Math.sqrt(Math.pow(p.ball.x - CENTER_X, 2) + Math.pow(p.ball.y - CENTER_Y, 2));
            if (dist >= BOUNDARY_RADIUS) {
                const isSix = p.ball.bounces === 0 && p.ball.z > 0;
                setCommentary(prev => [isSix ? "SIX! Over the ropes!" : "FOUR! Straight to the fence!", ...prev]);
                updateScore(isSix ? 6 : 4, 0);
                resetBallPhase('dead');
                return;
            }

            let intercepted = false;
            p.fielders.forEach(f => {
                const fDist = Math.sqrt(Math.pow(f.x - p.ball.x, 2) + Math.pow(f.y - p.ball.y, 2));
                const dx = p.ball.x - f.x;
                const dy = p.ball.y - f.y;
                const angle = Math.atan2(dy, dx);
                f.x += Math.cos(angle) * (f.speed * 2.8);
                f.y += Math.sin(angle) * (f.speed * 2.8);

                if (fDist < FIELDER_RADIUS + BALL_RADIUS + 3) {
                    if (p.ball.z > 6.5 && p.ball.bounces === 0) {
                        setCommentary(prev => ["OUT! Caught!", ...prev]);
                        updateScore(0, 1);
                        p.ball.state = 'wicket';
                        intercepted = true;
                        handleDismissal();
                    } else if (p.ball.z < 12) {
                        p.ball.vx = 0; p.ball.vy = 0;
                        const distFromPitch = Math.abs(p.ball.y - PITCH_END_Y);
                        const runs = distFromPitch > 230 ? 3 : distFromPitch > 120 ? 2 : distFromPitch > 40 ? 1 : 0;
                        setCommentary(prev => [runs > 0 ? `${runs} runs taken.` : "No run.", ...prev]);
                        updateScore(runs, 0);
                        resetBallPhase('dead');
                        intercepted = true;
                    }
                }
            });
            
            if (!intercepted && Math.abs(p.ball.vx) < 0.2 && Math.abs(p.ball.vy) < 0.2) {
                const distFromPitch = Math.abs(p.ball.y - PITCH_END_Y);
                const runs = distFromPitch > 140 ? 2 : distFromPitch > 50 ? 1 : 0;
                updateScore(runs, 0);
                resetBallPhase('dead');
            }
        }
    };

    const startBall = () => {
        if (gameOver || ballPhase !== 'dead' || modalType) return;
        resetBallPhase('runup');
        game.current.bowlerPos = { x: CENTER_X, y: PITCH_START_Y - 30 };
        game.current.ball.z = 0;
        game.current.ball.bounces = 0;
    };

    useEffect(() => {
        if (inningsState.length === 0 || ballPhase !== 'dead' || modalType || gameOver) return;
        const inn = inningsState[currentInningIndex];
        const balls = inn.bowling.reduce((a, b) => a + b.ballsBowled, 0);
        const maxOvers = gameData.currentFormat.includes('T20') ? 20 : 50;

        if (target && inn.score > target) { setGameOver(true); return; }
        if (inn.wickets >= 10 || Math.floor(balls / 6) >= maxOvers) {
            if (currentInningIndex === 0) switchInning();
            else setGameOver(true);
            return;
        }

        if (balls > 0 && balls % 6 === 0) {
            setStrikerId(prev => { 
                const old = prev;
                setNonStrikerId(old);
                return game.current.nonStrikerId; 
            });
            if (bowlingTeam?.id === gameData.userTeamId) setModalType('bowler');
            else {
                const nextB = inn.bowling.find(b => b.playerId !== bowlerId && b.ballsBowled < (maxOvers / 5) * 6) || inn.bowling[0];
                setBowlerId(nextB.playerId);
            }
        }
    }, [inningsState, ballPhase, modalType, gameOver, currentInningIndex]);

    const switchInning = () => {
        const inn0Score = inningsState[0].score;
        setTarget(inn0Score);
        setCurrentInningIndex(1);
        setBattingTeam(bowlingTeam);
        setBowlingTeam(battingTeam);
        setModalType('openers');
    };

    useEffect(() => {
        if (gameOver && !game.current.matchCompleteTriggered) {
            game.current.matchCompleteTriggered = true;
            const inn1 = inningsState[0];
            const inn2 = inningsState[1];
            const winnerId = (target && inn2.score > target) || (inn2.score > inn1.score) ? inn2.teamId : inn1.teamId;
            const summary = winnerId === inn2.teamId ? `${inn2.teamName} won by ${10 - inn2.wickets} wickets` : `${inn1.teamName} won by ${inn1.score - inn2.score} runs`;
            
            setTimeout(() => onMatchComplete({
                matchNumber: match.matchNumber, summary, winnerId, loserId: winnerId === inn1.teamId ? inn2.teamId : inn1.teamId,
                firstInning: inn1, secondInning: inn2, manOfTheMatch: { playerId: '', playerName: 'TBD', teamId: '', summary: '' }
            }), 1500);
        }
    }, [gameOver]);

    useEffect(() => {
        let frameId: number;
        const ctx = canvasRef.current?.getContext('2d');
        const loop = () => {
            processBall();
            if (ctx) {
                ctx.fillStyle = "#2c4c23"; ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
                ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, 150, 0, Math.PI*2); ctx.stroke();
                ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, BOUNDARY_RADIUS, 0, Math.PI*2); ctx.stroke();
                ctx.fillStyle = "#ccb68d"; ctx.fillRect(CENTER_X - 15, PITCH_START_Y, 30, PITCH_END_Y - PITCH_START_Y);
                ctx.strokeStyle = "white"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(CENTER_X - 20, PITCH_START_Y); ctx.lineTo(CENTER_X + 20, PITCH_START_Y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(CENTER_X - 20, PITCH_END_Y); ctx.lineTo(CENTER_X + 20, PITCH_END_Y); ctx.stroke();
                game.current.fielders.forEach(f => {
                    ctx.fillStyle = "#FDE047"; ctx.beginPath(); ctx.arc(f.x, f.y, FIELDER_RADIUS, 0, Math.PI*2); ctx.fill();
                });
                const b = game.current.ball;
                if (b.state !== 'dead') {
                    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_RADIUS + (b.z / 4), 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(b.x, b.y - b.z, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = "#EF4444"; ctx.beginPath(); ctx.arc(game.current.bowlerPos.x, game.current.bowlerPos.y, FIELDER_RADIUS, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#3B82F6"; ctx.beginPath(); ctx.arc(CENTER_X, PITCH_END_Y + 5, FIELDER_RADIUS, 0, Math.PI * 2); ctx.fill();
            }
            frameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(frameId);
    }, [bowlingTeam, processBall]);

    const handleDrag = (e: any) => {
        if (bowlingTeam?.id !== gameData.userTeamId || ballPhase !== 'dead') return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const x = (clientX - rect.left) * (FIELD_WIDTH / rect.width);
        const y = (clientY - rect.top) * (FIELD_HEIGHT / rect.height);
        if (e.type === 'mousedown' || e.type === 'touchstart') {
            game.current.draggedFielder = game.current.fielders.findIndex(f => Math.sqrt(Math.pow(f.x - x, 2) + Math.pow(f.y - y, 2)) < FIELDER_RADIUS * 3);
        } else if (game.current.draggedFielder !== null) {
            const f = game.current.fielders[game.current.draggedFielder];
            f.x = x; f.y = y;
        }
    };

    const confirmOpeners = () => {
        if (selectedModalId && selectedModalId2) {
            setStrikerId(selectedModalId); setNonStrikerId(selectedModalId2); setModalType(null);
            const fielders: Fielder[] = [
                { id: 'wk', x: CENTER_X, y: PITCH_END_Y + 40, role: 'keeper', speed: 0.8, name: 'WK' },
                { id: 'bwl', x: CENTER_X, y: PITCH_START_Y - 20, role: 'bowler', speed: 1.0, name: 'BWL' }
            ];
            for(let i=0; i<9; i++) {
                const angle = (i * 40) * (Math.PI / 180);
                fielders.push({ id: `f${i}`, x: CENTER_X + Math.cos(angle) * 180, y: CENTER_Y + Math.sin(angle) * 180, role: 'fielder', speed: 0.9 + Math.random() * 0.2, name: `F${i + 1}` });
            }
            game.current.fielders = fielders;
            const currentBowlers = inningsState[currentInningIndex]?.bowling;
            if (currentBowlers && currentBowlers.length > 0) {
                setBowlerId(currentBowlers[0].playerId);
            }
        }
    };

    // Broadcast UI Derived Data
    const currentInning = inningsState[currentInningIndex];
    const striker = currentInning?.batting.find(b => b.playerId === strikerId);
    const nonStriker = currentInning?.batting.find(b => b.playerId === nonStrikerId);
    const bowler = currentInning?.bowling.find(b => b.playerId === bowlerId);
    const projScore = currentInning ? Math.round(currentInning.score + (currentInning.score / (parseFloat(currentInning.overs) || 1)) * (20 - parseFloat(currentInning.overs))) : 0;

    return (
        <div className="flex flex-col h-full bg-black text-white select-none overflow-hidden relative font-sans italic tracking-tighter">
            <style>{`
                .slanted-box { clip-path: polygon(0% 0%, 100% 0%, 90% 100%, 0% 100%); }
                .slanted-divider { clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%); }
                .over-history-dot { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; }
                .scorebar-gradient { background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(20,20,20,1) 100%); }
                .team-bg-pink { background: linear-gradient(135deg, #f13b5e 0%, #c02444 100%); }
            `}</style>

            {/* Field View (Video Content Emulation) */}
            <div className="flex-1 relative bg-[#1c2e17] flex justify-center">
                <canvas ref={canvasRef} width={FIELD_WIDTH} height={FIELD_HEIGHT} className="h-full w-auto object-contain cursor-crosshair touch-none"
                    onMouseDown={handleDrag} onMouseMove={handleDrag} onMouseUp={() => game.current.draggedFielder = null}
                    onTouchStart={handleDrag} onTouchMove={handleDrag} onTouchEnd={() => game.current.draggedFielder = null}
                />
                
                {/* Score Overlays (SIX, FOUR, OUT) */}
                {ballPhase === 'boundary' && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping z-50">
                        <div className="bg-pink-600 text-white font-black text-7xl px-12 py-6 border-8 border-white skew-x-[-12deg] shadow-[0_0_40px_rgba(241,59,94,0.8)]">
                            {commentary[0]?.startsWith('SIX') ? 'SIX!' : 'FOUR!'}
                        </div>
                    </div>
                )}

                {/* BROADCAST SCOREBAR (BOTTOM LEFT) */}
                <div className="absolute bottom-10 left-0 w-full px-4 flex justify-start pointer-events-none z-40">
                    <div className="flex items-end drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                        {/* Team Indicator & Main Score */}
                        <div className="flex flex-col">
                            <div className="team-bg-pink slanted-box h-12 flex flex-col justify-center px-4 pr-10 min-w-[140px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-white/20 rounded p-0.5" dangerouslySetInnerHTML={{__html: gameData.allTeamsData.find(t => t.id === battingTeam?.id)?.logo || ''}}></div>
                                    <span className="text-3xl font-black text-white italic leading-none">{currentInning?.score} {'-'} {currentInning?.wickets}</span>
                                </div>
                            </div>
                            <div className="bg-black/90 slanted-box h-6 flex items-center px-3 pr-8 border-l-4 border-pink-500 mt-[-4px]">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-2">OVERS</span>
                                <span className="text-xs font-black text-white">{currentInning?.overs}</span>
                            </div>
                        </div>

                        {/* Player Pods (Joined) */}
                        <div className="flex scorebar-gradient h-12 ml-[-12px] border-b-4 border-pink-600">
                            {/* Striker Pod */}
                            <div className="flex flex-col justify-center px-6 min-w-[130px] border-r border-white/10">
                                <span className="text-[11px] font-black text-white uppercase italic tracking-tighter">{striker?.playerName.split(' ').pop()}</span>
                                <div className="flex items-center gap-2 mt-[-2px]">
                                    <span className="text-xl font-black text-pink-500 italic leading-none">{striker?.runs}</span>
                                    <span className="text-[11px] font-bold text-zinc-400 mt-1">{striker?.balls}</span>
                                </div>
                            </div>
                            {/* Non-Striker Pod */}
                            <div className="flex flex-col justify-center px-6 min-w-[130px] border-r border-white/10 opacity-60">
                                <span className="text-[11px] font-black text-white uppercase italic tracking-tighter">{nonStriker?.playerName.split(' ').pop()}</span>
                                <div className="flex items-center gap-2 mt-[-2px]">
                                    <span className="text-xl font-black text-white italic leading-none">{nonStriker?.runs}</span>
                                    <span className="text-[11px] font-bold text-zinc-400 mt-1">{nonStriker?.balls}</span>
                                </div>
                            </div>
                            {/* Bowler Pod */}
                            <div className="flex flex-col justify-center px-6 min-w-[130px] bg-pink-900/10">
                                <span className="text-[11px] font-black text-pink-400 uppercase italic tracking-tighter">BOWLING</span>
                                <div className="flex items-center gap-2 mt-[-2px]">
                                    <span className="text-xl font-black text-white italic leading-none">{bowler?.wickets} {'-'} {bowler?.runsConceded}</span>
                                    <span className="text-[10px] font-bold text-zinc-400 mt-1">({bowler?.overs})</span>
                                </div>
                            </div>
                        </div>

                        {/* Projection & History Pod */}
                        <div className="flex bg-black/95 h-10 items-center px-6 ml-[-4px] self-end mb-[-4px]">
                            <div className="flex flex-col mr-6">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter leading-none">PROJECTED</span>
                                <span className="text-xs font-black text-white leading-none mt-0.5">CURRENT {projScore}</span>
                            </div>
                            <div className="flex gap-1.5 items-center">
                                {/* Fix: Safe access to recentBalls which is now on Inning type */}
                                {[...currentInning?.recentBalls || []].slice(0, 6).reverse().map((b, i) => (
                                    <div key={i} className={`over-history-dot ${b === '4' ? 'border-green-500 text-green-500' : b === '6' ? 'border-pink-500 text-pink-500' : b === 'W' ? 'bg-red-600 border-red-600 text-white' : 'text-zinc-300'}`}>
                                        {b === '0' ? '●' : b}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interaction Layer */}
            <div className="bg-zinc-950 p-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                     <div className="flex gap-2">
                        {battingTeam?.id === gameData.userTeamId ? (
                            (['Defensive', 'Balanced', 'Attacking'] as Aggression[]).map(agg => (
                                <button key={agg} onClick={() => setAggression(agg)} className={`px-4 py-1.5 text-[10px] font-black rounded-full uppercase transition-all ${aggression === agg ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(241,59,94,0.4)]' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>{agg}</button>
                            ))
                        ) : <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest px-4">DRAG FIELDERS TO ADJUST POSITION</span>}
                     </div>
                </div>

                <div className="flex gap-3 h-16">
                    {ballPhase === 'dead' && !gameOver && !modalType && (
                        <button onClick={startBall} className="flex-[3] bg-pink-600 hover:bg-pink-500 rounded-2xl font-black text-2xl italic tracking-tighter shadow-2xl transition-transform active:scale-95 animate-pulse flex items-center justify-center gap-2">
                            {battingTeam?.id === gameData.userTeamId ? "PLAY BALL" : "BOWL OVER"}
                        </button>
                    )}
                    <button onClick={onExit} className="flex-1 bg-zinc-800 hover:bg-red-950 rounded-2xl font-black text-xs text-zinc-400 transition-colors uppercase tracking-widest">Quit</button>
                </div>
            </div>

            {/* Professional Styled Selection Modals */}
            {modalType && (
                <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center p-8 backdrop-blur-md">
                    <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-[40px] border-2 border-pink-500/20 shadow-[0_0_60px_rgba(241,59,94,0.15)]">
                        <h3 className="text-2xl font-black text-center mb-8 text-white uppercase italic tracking-tighter leading-none border-b border-white/5 pb-4">
                            {modalType === 'openers' ? 'SELECT OPENING DUO' : modalType === 'batter' ? 'NEW BATTER' : 'CHANGE BOWLER'}
                        </h3>
                        <div className="space-y-4">
                            <select className="w-full p-4 bg-zinc-800 rounded-2xl border-none text-white font-bold text-sm focus:ring-2 focus:ring-pink-500 appearance-none" value={selectedModalId} onChange={e => setSelectedModalId(e.target.value)}>
                                <option value="">{modalType === 'bowler' ? 'CHOOSE BOWLER' : 'CHOOSE BATSMAN'}</option>
                                {modalType === 'bowler' ? 
                                    inningsState[currentInningIndex].bowling.filter(p => p.playerId !== bowlerId).map(p => <option key={p.playerId} value={p.playerId}>{p.playerName.toUpperCase()} ({p.overs})</option>) :
                                    inningsState[currentInningIndex].batting.filter(p => !p.isOut && p.playerId !== nonStrikerId).map(p => <option key={p.playerId} value={p.playerId}>{p.playerName.toUpperCase()}</option>)
                                }
                            </select>
                            {modalType === 'openers' && (
                                <select className="w-full p-4 bg-zinc-800 rounded-2xl border-none text-white font-bold text-sm focus:ring-2 focus:ring-pink-500 appearance-none" value={selectedModalId2} onChange={e => setSelectedModalId2(e.target.value)}>
                                    <option value="">NON-STRIKER</option>
                                    {inningsState[currentInningIndex].batting.filter(p => !p.isOut && p.playerId !== selectedModalId).map(p => <option key={p.playerId} value={p.playerId}>{p.playerName.toUpperCase()}</option>)}
                                </select>
                            )}
                            <button disabled={!selectedModalId || (modalType === 'openers' && !selectedModalId2)} onClick={() => {
                                if (modalType === 'openers') confirmOpeners();
                                else if (modalType === 'batter') { setStrikerId(selectedModalId); setModalType(null); }
                                else { setBowlerId(selectedModalId); setModalType(null); }
                                setSelectedModalId(''); setSelectedModalId2('');
                            }} className="w-full bg-pink-600 hover:bg-pink-500 py-5 rounded-2xl font-black text-white shadow-xl disabled:opacity-10 uppercase italic tracking-widest text-lg transition-all mt-6">Ready to Play</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
