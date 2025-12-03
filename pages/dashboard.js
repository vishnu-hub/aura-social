import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]); 
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(null); 
  const [loading, setLoading] = useState(true);

  // 1. Load Current User & Recommendations
  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) return router.push('/');

      try {
        const mySnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (!mySnap.exists()) return router.push('/setup');
        
        const myData = mySnap.data();
        const safeUser = {
            uid: auth.currentUser.uid,
            ...myData,
            campus: myData.campus || "IIT Bombay",
            lookingFor: myData.lookingFor || "Everyone",
            mode: myData.mode || "General",
            avatarSeed: myData.avatarSeed || "default",
            photoUrl: myData.photoUrl || "" 
        };
        setUser(safeUser);

        let q = query(
            collection(db, "users"), 
            where("campus", "==", safeUser.campus),
            where("mode", "==", safeUser.mode)
        );

        if (safeUser.lookingFor !== 'Everyone') {
            q = query(
                collection(db, "users"), 
                where("campus", "==", safeUser.campus),
                where("gender", "==", safeUser.lookingFor),
                where("mode", "==", safeUser.mode)
            );
        }

        const querySnapshot = await getDocs(q);
        const feed = [];

        querySnapshot.forEach((doc) => {
            const theirId = doc.id;
            // FILTER LOGIC: Remove people I already Liked, Passed, or Matched
            const myHistory = [...(myData.liked || []), ...(myData.passed || []), ...(myData.matches || [])];
            
            if (theirId !== safeUser.uid && !myHistory.includes(theirId)) {
                feed.push({ id: theirId, ...doc.data() });
            }
        });

        setProfiles(feed);
      } catch (error) {
          console.error("Dashboard Error:", error);
      }
      setLoading(false);
    };

    init();
  }, []);

  const handleLike = async () => {
    const target = profiles[currentCardIndex];
    if (!target || !user) return;

    const targetSnap = await getDoc(doc(db, "users", target.id));
    const targetData = targetSnap.data();
    
    // Check if THEY liked ME
    const isMatch = targetData?.liked?.includes(user.uid);

    if (isMatch) {
        triggerMatch(target);
    } else {
        // Just a like
        await updateDoc(doc(db, "users", user.uid), { liked: arrayUnion(target.id) });
        nextCard();
    }
  };

  const handlePass = async () => {
    const target = profiles[currentCardIndex];
    if (!target || !user) return;

    await updateDoc(doc(db, "users", user.uid), { passed: arrayUnion(target.id) });
    nextCard();
  };

  const nextCard = () => { setCurrentCardIndex(prev => prev + 1); };

  // --- NEW: RECYCLE LOGIC (Reset the 'Passed' Array) ---
  const handleRecycle = async () => {
      if(!confirm("Bring back everyone you rejected? You might see old profiles again.")) return;
      
      setLoading(true);
      try {
          // Empty the 'passed' list in the database
          await updateDoc(doc(db, "users", user.uid), {
              passed: [] 
          });
          // Reload the page to fetch the "new" old profiles
          router.reload();
      } catch (e) {
          alert("Error resetting feed: " + e.message);
          setLoading(false);
      }
  };

  const triggerMatch = async (targetUser) => {
    confetti(); 
    const chatRef = await addDoc(collection(db, "chats"), {
        users: [user.uid, targetUser.id],
        createdAt: serverTimestamp(),
        lastMessage: "Matched! Say hi."
    });

    await updateDoc(doc(db, "users", user.uid), { matches: arrayUnion(targetUser.id) });
    await updateDoc(doc(db, "users", targetUser.id), { matches: arrayUnion(user.uid) });

    setShowMatchPopup({ ...targetUser, chatId: chatRef.id });
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading Vibes...</div>;
  if (!user) return <div className="h-screen bg-black text-white flex items-center justify-center">Reloading...</div>;

  const currentProfile = profiles[currentCardIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 max-w-md px-2">
        <button onClick={() => router.push('/profile')}>
            <img 
                src={user?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.avatarSeed || 'default'}`} 
                className="w-10 h-10 rounded-full border border-purple-500 bg-gray-800 object-cover"
            />
        </button>

        <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-2xl tracking-tighter">
            AURA
        </h1>

        <button onClick={() => router.push('/matches')} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 border border-gray-800">
            💬
        </button>
      </div>

      {/* MATCH POPUP */}
      {showMatchPopup && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6">
            <h1 className="text-4xl font-bold text-green-400 mb-2">It's a Match!</h1>
            <div className="flex gap-4 items-center mb-8">
                <img src={user?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.avatarSeed}`} className="w-20 h-20 rounded-full border-2 border-purple-500 bg-white"/>
                <span className="text-2xl">⚡</span>
                <img src={showMatchPopup?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${showMatchPopup?.avatarSeed}`} className="w-20 h-20 rounded-full border-2 border-pink-500 bg-white"/>
            </div>
            <button onClick={() => router.push(`/chat?id=${showMatchPopup.chatId}`)} className="w-full max-w-xs bg-purple-600 py-4 rounded-full font-bold mb-4">Send Message</button>
            <button onClick={() => { setShowMatchPopup(null); nextCard(); }} className="text-gray-500">Keep Swiping</button>
        </div>
      )}

      {/* --- THE TERNARY OPERATOR (The If / Else Logic) --- */}
      {currentProfile ? (
        /* IF: We have a profile to show */
        <div className="w-full max-w-md flex-1 flex flex-col">
            <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative flex-1">
                <div className="h-2/3 bg-gray-800 flex items-center justify-center relative">
                    <img 
                        src={currentProfile?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentProfile?.avatarSeed || 'card'}`} 
                        className="w-full h-full object-cover bg-gray-200 pointer-events-none"
                    />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent h-20"></div>
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-3xl font-bold">{currentProfile.displayName}</h2>
                        <span className="text-purple-400 font-mono text-sm">{currentProfile.batch}</span>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300 border border-gray-700">{currentProfile.campus}</span>
                        {currentProfile.mode === 'MoodIndigo' && <span className="bg-yellow-900/50 text-yellow-400 px-3 py-1 rounded-full text-xs">🎷 MoodI Mode</span>}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-3">{currentProfile.bio}</p>
                </div>
            </div>
            <div className="flex justify-center gap-6 mt-6 mb-4">
                <button onClick={handlePass} className="w-16 h-16 rounded-full bg-gray-800 border border-red-500 text-red-500 text-3xl">✕</button>
                <button onClick={handleLike} className="w-16 h-16 rounded-full bg-gray-800 border border-green-500 text-green-500 text-3xl">♥</button>
            </div>
        </div>
      ) : (
        /* ELSE: No profiles left (The "End of World" Screen) */
        <div className="flex flex-col items-center justify-center h-2/3 text-center max-w-xs">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold mb-2">That's everyone!</h2>
            <p className="text-gray-400 mb-6 text-sm">You've seen all profiles in {user.campus}.</p>
            
            {/* OPTION 1: Refresh just in case */}
            <button onClick={() => router.reload()} className="text-purple-400 hover:text-white mb-4">Refresh Feed</button>

            {/* OPTION 2: THE RECYCLE BUTTON */}
            <button 
                onClick={handleRecycle}
                className="bg-gray-800 border border-gray-600 text-white px-6 py-3 rounded-full hover:bg-gray-700 transition"
            >
                🔄 Review Rejected Profiles
            </button>
        </div>
      )}
    </div>
  );
}