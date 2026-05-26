
import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, Cloud, CloudOff, Database } from 'lucide-react';

interface SettingsProps {
    onResetGame: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    saveGame: () => void;
    loadGame: () => void;
    user: User | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onResetGame, theme, setTheme, saveGame, loadGame, user, onSignIn, onSignOut }) => (
    <div className="p-6">
        <h2 className="text-2xl font-black text-center mb-6 tracking-tight uppercase">Settings</h2>
        
        {/* User Account Section */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/5">
            {user ? (
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full border-2 border-teal-500"
                            referrerPolicy="no-referrer"
                        />
                        <div className="flex-grow">
                            <p className="text-xs font-bold text-teal-500 uppercase leading-none">Cloud Connected</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate">{user.displayName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if (window.confirm("Sign Out? You will still keep your local save.")) {
                                    onSignOut();
                                }
                            }}
                            className="flex-grow flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4 text-center space-y-3">
                    <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                        <CloudOff size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold dark:text-white">Not Signed In</p>
                        <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto">Sign in with Google to enable automatic cloud backup and cross-device play.</p>
                    </div>
                    <button 
                        onClick={onSignIn}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20"
                    >
                        Sign In with Google
                    </button>
                </div>
            )}
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl">
                <span className="font-bold text-sm">Theme</span>
                <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-lg">
                    <button onClick={() => setTheme('light')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Light</button>
                    <button onClick={() => setTheme('dark')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Dark</button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={saveGame} className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 border-2 border-dashed border-teal-500/30 text-teal-600 dark:text-teal-400 font-black py-3 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-all active:scale-95">
                    <Cloud size={18} />
                    <span className="text-[10px] uppercase tracking-tighter">Sync Save</span>
                </button>
                <button onClick={loadGame} className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-black py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95">
                    <Database size={18} />
                    <span className="text-[10px] uppercase tracking-tighter">Load Save</span>
                </button>
            </div>

            <button 
                onClick={() => {
                    if (window.confirm("Go back to Main Menu? Progress is saved automatically.")) {
                        window.location.reload();
                    }
                }} 
                className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-black py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
                EXIT TO MAIN MENU
            </button>

            <div className="pt-8 mt-4 border-t border-slate-200 dark:border-white/5">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black mb-3 px-1 tracking-widest text-center">DANGER ZONE</p>
                <button 
                    onClick={onResetGame} 
                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 font-black py-3.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                    DELETE ALL DATA
                </button>
            </div>
        </div>
    </div>
);

export default Settings;
