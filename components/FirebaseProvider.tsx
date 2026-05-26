import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, syncUser, db } from '../services/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

interface FirebaseContextType {
    user: User | null;
    loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ user: null, loading: true });

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                await syncUser(u.uid, u.email, u.displayName);
                setUser(u);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Test connection as per skill instructions
        const testConnection = async () => {
            try {
                // This is a dummy path just to verify connectivity/auth
                await getDocFromServer(doc(db, 'system', 'ping'));
            } catch (error) {
                if (error instanceof Error && error.message.includes('offline')) {
                    console.error("Firebase is offline. Check configuration.");
                }
            }
        };
        testConnection();

        return () => unsubscribe();
    }, []);

    return (
        <FirebaseContext.Provider value={{ user, loading }}>
            {children}
        </FirebaseContext.Provider>
    );
};
