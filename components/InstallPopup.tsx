import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from './Icons';

interface InstallPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onInstall: () => void;
}

const InstallPopup: React.FC<InstallPopupProps> = ({ isVisible, onClose, onInstall }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-teal-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-500/30">
                <img 
                  src="https://img.icons8.com/isometric/100/cricket.png" 
                  alt="App Icon" 
                  className="w-12 h-12"
                />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Offline Ready (APK Mode)</h3>
              <p className="text-slate-400 text-sm mb-6">
                This Web App works just like an APK. Install to your home screen to play without internet and get full-screen view.
              </p>

              <div className="space-y-3">
                <button
                  onClick={onInstall}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-black font-black py-4 rounded-2xl transition-all transform active:scale-95 shadow-lg shadow-teal-500/20"
                >
                  INSTALL NOW
                </button>
                
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">Manual Installation</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                      <span className="text-slate-300 block mb-1">Android/Chrome</span>
                      <span className="text-slate-500">Tap ⋮ then "Add to Home Screen"</span>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                      <span className="text-slate-300 block mb-1">iOS/Safari</span>
                      <span className="text-slate-500">Tap share icon then "Add to Home Screen"</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full text-slate-500 hover:text-slate-300 text-xs font-bold py-2"
                >
                  MAYBE LATER
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPopup;
