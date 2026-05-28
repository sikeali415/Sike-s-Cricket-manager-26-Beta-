
import React from 'react';

import { User } from 'firebase/auth';

interface MainMenuProps {
    onStartNewGame: () => void;
    onResumeGame: () => void;
    hasSaveData: boolean;
    user: User | null;
    onSignIn: () => void;
    onSignOut: () => void;
    onInstall?: () => void;
    isInstallable?: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartNewGame, onResumeGame, hasSaveData, user, onSignIn, onSignOut, onInstall, isInstallable }) => (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 1)), url('https://images.unsplash.com/photo-1595435942477-f5439483405a?q=80&w=2070&auto=format&fit=crop')" }}>
        <div className="h-full w-full absolute top-0 left-0 bg-gradient-to-b dark:from-black/70 dark:to-[#2C3531] from-gray-100/70 to-gray-50"></div>
        
        {/* User Profile / Login */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full px-6 flex justify-center z-20">
            {user ? (
                <div className="flex items-center gap-3 bg-white/20 dark:bg-black/20 backdrop-blur-md p-2 px-4 rounded-full border border-white/30">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-8 h-8 rounded-full border border-white" referrerPolicy="no-referrer" />
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 leading-none">SIGNED IN AS</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{user.displayName?.split(' ')[0]}</p>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={onSignIn}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-full shadow-lg border border-teal-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                    <svg className="w-5 h-5 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.4-1.12 1.12-2.6 1.96-4.64 1.96-4.12 0-7.44-3.24-7.44-7.36s3.32-7.36 7.44-7.36c2.24 0 4 .88 5.28 2.12l2.32-2.32C19.12 1.28 16.32 0 12.48 0 5.48 0 0 5.48 0 12.48s5.48 12.48 12.48 12.48c4.08 0 7.16-1.32 9.56-3.84 2.48-2.48 3.24-5.92 3.24-8.8 0-.84-.08-1.64-.16-2.4H12.48z"/>
                    </svg>
                    <span className="font-bold text-sm tracking-tight">Sign In with Google</span>
                </button>
            )}
        </div>

        <div className="relative z-10 text-center">
            <h2 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">Sike's</h2>
            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">CRICKET MANAGER</h1>
            <h2 className="text-5xl font-extrabold text-teal-600 dark:text-teal-400 mb-12">25</h2>
            <div className="space-y-4">
                {hasSaveData && (
                    <button
                        onClick={onResumeGame}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-10 text-xl rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 w-full"
                    >
                        Resume Game
                    </button>
                )}
                <button
                    onClick={onStartNewGame}
                    className="bg-gray-800 hover:bg-black dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-900 font-bold py-3 px-10 text-xl rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 w-full"
                >
                    {hasSaveData ? "Start New Game" : "Start Career"}
                </button>
                {isInstallable && (
                    <button
                        onClick={onInstall}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black py-2 px-6 rounded-xl border border-emerald-500/20 w-full text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Install App (Offline)
                    </button>
                )}
                {hasSaveData && (
                    <button
                        onClick={() => {
                            if (window.confirm("Hard Reset all progress? This cannot be undone.")) {
                                localStorage.removeItem('cricketManagerSave');
                                window.location.reload();
                            }
                        }}
                        className="text-red-500 text-xs font-bold uppercase tracking-widest mt-8 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        Reset All Data
                    </button>
                )}
            </div>
        </div>
    </div>
);

export default MainMenu;
