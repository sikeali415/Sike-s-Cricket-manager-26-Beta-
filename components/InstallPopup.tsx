import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icons';

interface InstallPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onInstall: () => void;
}

const InstallPopup: React.FC<InstallPopupProps> = ({ isVisible, onClose, onInstall }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-slate-900 border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl p-8 text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-teal-500 rounded-3xl flex items-center justify-center shadow-xl shadow-teal-500/20">
                <Icons.PlayMatch className="w-12 h-12 text-black" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 italic uppercase tracking-tight">Draft Room (Offline)</h3>
            <p className="text-slate-400 text-sm mb-8">
              This app works offline just like an APK. Install to your home screen for full-screen mode and better performance.
            </p>

            <div className="space-y-3">
              <button
                onClick={onInstall}
                className="w-full bg-teal-500 hover:bg-teal-400 text-black font-black py-4 rounded-2xl transition-all active:scale-95 uppercase italic tracking-tighter"
              >
                Install Now
              </button>
              <button
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-2xl transition-all text-xs uppercase"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPopup;
