import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) router.push('/');
      else {
        const unsubDoc = onSnapshot(doc(db, "users", u.uid), (d) => {
           const data = d.data();
           setUser(data);
           // Trigger confetti if status changes to matched
           if (data?.status === 'matched') {
             confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
           }
        });
        return () => unsubDoc();
      }
    });
    return () => unsubAuth();
  }, []);

  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Aura...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background Glow */}
       <div className="absolute top-0 left-0 w-full h-full bg-purple-900 opacity-20 blur-3xl z-0 pointer-events-none"></div>

       <div className="z-10 text-center w-full max-w-md">
         <h1 className="text-3xl font-bold mb-2">Hello, {user.pseudoName}</h1>
         
         {user.status === 'unmatched' ? (
           <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl mt-8">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500 mx-auto mb-4"></div>
             <h2 className="text-xl font-semibold">Scanning Campus...</h2>
             <p className="mt-2 text-gray-400 text-sm">Matches are released in batches.</p>
           </div>
         ) : (
           <div className="bg-gradient-to-b from-purple-900 to-black border border-purple-500 p-8 rounded-2xl mt-8 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
             <h2 className="text-2xl font-bold mb-2">Match Found! 🔮</h2>
             <p className="text-gray-300 mb-6">Your vibes synced up.</p>
             <button 
               onClick={() => router.push(`/chat?id=${user.chatId}`)}
               className="bg-white text-black font-bold py-3 px-8 rounded-full w-full hover:scale-105 transition"
             >
               Reveal Chat
             </button>
           </div>
         )}
       </div>
    </div>
  );
}