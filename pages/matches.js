import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if(!auth.currentUser) return;

    const fetchMatches = async () => {
        // 1. Find all chats where I am a participant
        const q = query(collection(db, "chats"), where("users", "array-contains", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        
        const loadedMatches = [];
        
        for (const chatDoc of snapshot.docs) {
            const chatData = chatDoc.data();
            // Find the "Other Person"
            const otherUserId = chatData.users.find(id => id !== auth.currentUser.uid);
            
            // Fetch their profile
            const userSnap = await getDoc(doc(db, "users", otherUserId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                loadedMatches.push({
                    chatId: chatDoc.id,
                    ...userData,
                    // SAFETY: Fallbacks for missing data
                    photoUrl: userData.photoUrl || '',
                    avatarSeed: userData.avatarSeed || 'default'
                });
            }
        }
        setMatches(loadedMatches);
        setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Matches...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4">
        <div className="flex items-center mb-6">
            <button onClick={() => router.push('/dashboard')} className="text-2xl mr-4 text-gray-400">←</button>
            <h1 className="text-2xl font-bold">Your Matches</h1>
        </div>

        <div className="space-y-4">
            {matches.map(match => (
                <div 
                    key={match.chatId} 
                    onClick={() => router.push(`/chat?id=${match.chatId}`)}
                    className="flex items-center bg-gray-900 p-4 rounded-xl border border-gray-800 hover:border-purple-500 cursor-pointer transition"
                >
                    {/* REAL PHOTO LOGIC */}
                    <img 
                        src={match.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${match.avatarSeed}`} 
                        className="w-14 h-14 rounded-full bg-gray-800 object-cover mr-4 border border-gray-700"
                    />
                    <div>
                        <h3 className="font-bold text-lg">{match.displayName}</h3>
                        <p className="text-gray-500 text-sm">Tap to chat</p>
                    </div>
                </div>
            ))}
            
            {matches.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                    <p>No matches yet.</p>
                    <button onClick={() => router.push('/dashboard')} className="text-purple-400 mt-2 underline">Start Swiping</button>
                </div>
            )}
        </div>
    </div>
  );
}