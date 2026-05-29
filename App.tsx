import React, { useState, useEffect } from 'react';
import { AppState, GameData, Team, Format, MatchResult, Standing, Player } from './types';
import { PLAYERS, TEAMS, GROUNDS, PRE_BUILT_SQUADS, INITIAL_SPONSORSHIPS, INITIAL_NEWS } from './data';
import { LoadingSpinner, generateLeagueSchedule } from './utils';
import { useFirebase } from './components/FirebaseProvider';
import { saveGameToFirebase, signIn, signOutUser, getSaves } from './services/firebase';

// Components
import MainMenu from './components/MainMenu';
import TeamSelection from './components/TeamSelection';
import CareerHub from './components/CareerHub';
import AuctionRoom from './components/AuctionRoom';
import InstallPopup from './components/InstallPopup';

export const MAX_SQUAD_SIZE = 18;
export const MIN_SQUAD_SIZE = 12;
export const MAX_FOREIGN_PLAYERS = 5;

const GAME_VERSION = "26 Beta";
const GAME_TITLE = "Cricket manager " + GAME_VERSION;

export const App = () => {
  const [appState, setAppState] = useState<AppState>('MAIN_MENU');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasSaveData, setHasSaveData] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const { user, loading: firebaseLoading } = useFirebase();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showFeedback("Thank you for installing Sike's Cricket Manager!");
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    // Show install popup automatically after 3 seconds if on main menu and not already dismissed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('installPromptDismissed');
    
    if (appState === 'MAIN_MENU' && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowInstallBtn(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  const handleCloseInstallPopup = () => {
    setShowInstallBtn(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('cricketManagerTheme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark');
    const savedGame = localStorage.getItem('cricketManagerSave');
    if (savedGame) {
        setHasSaveData(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
    localStorage.setItem('cricketManagerTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (gameData && !isLoading) {
      localStorage.setItem('cricketManagerSave', JSON.stringify(gameData));
      setHasSaveData(true);
      
      // Auto-save to cloud if logged in
      if (user) {
          saveGameToFirebase(user.uid, 'autosave', 'Auto Save', gameData).catch(console.error);
      }
    }
  }, [gameData, isLoading, user]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const saveGame = async () => {
    if (!gameData) return;
    if (user) {
        showFeedback("Syncing with cloud...");
        await saveGameToFirebase(user.uid, 'autosave', 'Auto Save', gameData);
        showFeedback("Progress synced to cloud!");
    } else {
        showFeedback("Progress is saved locally! Sign in for cloud backup.");
    }
  };

  const loadGame = async () => {
    if (window.confirm("Loading will overwrite current progress. Continue?")) {
        if (user) {
            showFeedback("Fetching cloud saves...");
            const cloudSaves = await getSaves(user.uid);
            if (cloudSaves.length > 0) {
                // Find latest autosave
                const latest = cloudSaves.find((s: any) => s.id === 'autosave') || cloudSaves[0];
                setGameData(latest.data);
                showFeedback("Cloud Save Loaded!", "success");
                setAppState('CAREER_HUB');
                return;
            }
        }
        
        const savedGame = localStorage.getItem('cricketManagerSave');
        if (savedGame) {
            try {
                setGameData(JSON.parse(savedGame));
                showFeedback("Game Loaded!", "success");
                setAppState('CAREER_HUB');
            } catch (e) {
                console.error("Failed to parse saved game data during load:", e);
                localStorage.removeItem('cricketManagerSave');
                setHasSaveData(false);
                showFeedback("Failed to load saved game. It may be corrupt.", "error");
            }
        } else {
            showFeedback("No saved game found.", "error");
        }
    }
  };

  const resumeGame = () => {
    const savedGame = localStorage.getItem('cricketManagerSave');
    if (savedGame) {
        try {
            setGameData(JSON.parse(savedGame));
            setAppState('CAREER_HUB');
            showFeedback("Game Resumed!", "success");
        } catch(e) {
            console.error("Failed to parse saved game data:", e);
            localStorage.removeItem('cricketManagerSave');
            setHasSaveData(false);
            showFeedback("Failed to load saved game. It may be corrupt.", "error");
        }
    }
  };

  const handleStartNewGame = () => {
    if (hasSaveData && !window.confirm("Starting a new game will overwrite your saved progress. Are you sure?")) {
        return;
    }
    setAppState('TEAM_SELECTION');
  };

  const initializeNewGame = (userTeamId: string) => {
    setIsLoading(true);
    localStorage.removeItem('cricketManagerSave');
    
    // 1. Filter and stabilize pool
    const allPlayersPool = [...PLAYERS].sort(() => Math.random() - 0.5);
    const initialTeamsData = [...TEAMS];
    const usedPlayerIds = new Set<string>();

    const targetSquadSize = 16;
    const maxForeign = 5;

    const initialTeams: Team[] = initialTeamsData.map(teamData => {
        let squad: Player[] = [];
        let foreignCount = 0;

        // For auction mode, we only initialize with a few core players (e.g., 4)
        const targetRetainedSize = 4;

        // Start with pre-built core (usually first few established players)
        const preBuiltIds = (PRE_BUILT_SQUADS[teamData.id] || []).slice(0, targetRetainedSize);
        preBuiltIds.forEach(pid => {
            const p = PLAYERS.find(pl => pl.id === pid);
            if (p && !usedPlayerIds.has(pid)) {
                squad.push(JSON.parse(JSON.stringify(p)));
                usedPlayerIds.add(pid);
                if (p.isForeign) foreignCount++;
            }
        });

        // Ensure we have exactly targetRetainedSize to start
        while (squad.length < targetRetainedSize) {
            const leftoverIndex = allPlayersPool.findIndex(p => !usedPlayerIds.has(p.id));
            if (leftoverIndex !== -1) {
                const p = allPlayersPool[leftoverIndex];
                squad.push(JSON.parse(JSON.stringify(p)));
                usedPlayerIds.add(p.id);
                if (p.isForeign) foreignCount++;
            } else {
                break;
            }
        }

        return { 
            id: teamData.id, 
            name: teamData.name, 
            squad, 
            captains: {}, 
            purse: 100.0, // Full purse for auction
            firstAidKits: 2 
        };
    });

    const initialStandings = (teams: Team[]) => teams.map(team => ({ 
        teamId: team.id, teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 
    }));

    const schedules = {
        [Format.T20]: generateLeagueSchedule(initialTeams, Format.T20, true),
        [Format.ODI]: generateLeagueSchedule(initialTeams, Format.ODI, true),
        [Format.SHIELD]: generateLeagueSchedule(initialTeams, Format.SHIELD, true),
    };

    const newGameData: GameData = {
      userTeamId,
      teams: initialTeams,
      grounds: [...GROUNDS],
      allTeamsData: initialTeamsData,
      allPlayers: [...PLAYERS],
      schedule: schedules,
      currentMatchIndex: {
        [Format.T20]: 0,
        [Format.ODI]: 0,
        [Format.SHIELD]: 0,
      },
      standings: {
        [Format.T20]: initialStandings(initialTeams),
        [Format.ODI]: initialStandings(initialTeams),
        [Format.SHIELD]: initialStandings(initialTeams),
      },
      matchResults: Object.values(Format).reduce((acc, format) => {
        acc[format] = [];
        return acc;
      }, {} as Record<Format, MatchResult[]>),
      playingXIs: {},
      currentSeason: 1,
      currentFormat: Format.T20, 
      awardsHistory: [],
      scoreLimits: {},
      records: {
        batterVsBowler: [],
        teamVsTeam: [],
        playerVsTeam: [],
      },
      promotionHistory: [],
      popularity: 50,
      sponsorships: INITIAL_SPONSORSHIPS,
      news: INITIAL_NEWS,
      activeMatch: null,
      settings: {
          isDoubleRoundRobin: true
      }
    };

    setGameData(newGameData);
    setAppState('AUCTION'); // Re-enable Auction
    setIsLoading(false);
    
    // Save immediately so progress isn't lost
    localStorage.setItem('cricketManagerSave', JSON.stringify(newGameData));
    showFeedback("Draft Room Initialized!", "success");
  };

  const handleAuctionComplete = (finalTeams: Team[]) => {
      setGameData(prev => {
          if (!prev) return null;
          return { ...prev, teams: finalTeams };
      });
      setAppState('CAREER_HUB');
      showFeedback("Draft Room Closed! Ready for Match 1.", "success");
  };

  const resetGame = () => {
      if (window.confirm("WARNING: This will PERMANENTLY DELETE all your progress, including career records, stats, and saved drafts. Are you sure?")) {
          localStorage.removeItem('cricketManagerSave');
          localStorage.removeItem('cricketManagerTheme'); // Optional: reset theme too
          setGameData(null);
          setHasSaveData(false);
          setAppState('MAIN_MENU');
          window.location.reload(); // Hard refresh to ensure all states are clean
      }
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="bg-white dark:bg-gray-900 h-full flex items-center justify-center"><LoadingSpinner /></div>;
    }
    switch(appState) {
        case 'MAIN_MENU': return (
            <MainMenu 
                onStartNewGame={handleStartNewGame} 
                onResumeGame={resumeGame} 
                hasSaveData={hasSaveData} 
                user={user} 
                onSignIn={signIn} 
                onSignOut={signOutUser}
                onInstall={() => setShowInstallBtn(true)}
                isInstallable={!window.matchMedia('(display-mode: standalone)').matches}
            />
        );
        case 'TEAM_SELECTION': return <TeamSelection onTeamSelected={initializeNewGame} theme={theme} />;
        case 'AUCTION': return gameData ? <AuctionRoom gameData={gameData} onAuctionComplete={handleAuctionComplete} /> : null;
        case 'CAREER_HUB': return gameData ? <CareerHub gameData={gameData} setGameData={setGameData} onResetGame={resetGame} theme={theme} setTheme={setTheme} saveGame={saveGame} loadGame={loadGame} showFeedback={showFeedback} /> : null;
        default: return <div>Error</div>;
    }
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-md h-screen max-h-[932px] bg-gray-50 dark:bg-[#2C3531] border-4 border-gray-300 dark:border-gray-700 rounded-[60px] shadow-2xl shadow-black/50 overflow-hidden relative text-gray-900 dark:text-gray-200 flex flex-col">
        <InstallPopup 
          isVisible={showInstallBtn} 
          onClose={handleCloseInstallPopup} 
          onInstall={handleInstallClick} 
        />
        {renderContent()}
        {feedbackMessage && (
            <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-50 shadow-lg text-white font-semibold ${feedbackMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {feedbackMessage.text}
            </div>
        )}
      </div>
    </div>
  );
};