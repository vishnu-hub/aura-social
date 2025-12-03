import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]); // The "Deck" of cards
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showMatchPopup, setShowMatchPopup] = useState(null); // Stores the matched user details
  const [loading, setLoading] = useState(true);

  // 1. Load Current User & Recommendations
  useEffect(() => {
    const init = async () => {
      const u = auth.currentUser;
      if (!u) return router.push('/');

      // Get My Profile
      const mySnap = await getDoc(doc(db, "users", u.uid));
      if (!mySnap.exists()) return router.push('/setup');
      const myData = mySnap.data();
      setUser({ uid: u.uid, ...myData });

      // Build the "Feed" Query
      // Rule 1: Must be same Campus
      // Rule 2: Must match my "Looking For" preference
      // Rule 3: Must be in same "Mode" (MoodI vs General)
      let q = query(
        collection(db, "users"), 
        where("campus", "==", myData.campus),
        where("gender", "==", myData.lookingFor),
        where("mode", "==", myData.mode)
      );

      // (If looking for "Everyone", we relax the gender rule)
      if (myData.lookingFor === 'Everyone') {
         q = query(collection(db, "users"), where("campus", "==", myData.campus), where("mode", "==", myData.mode));
      }

      const querySnapshot = await getDocs(q);
      const feed = [];

      querySnapshot.forEach((doc) => {
        // CLIENT-SIDE FILTERING (Crucial)
        // Don't show: Myself, People I already Liked/Passed/Matched
        const theirId = doc.id;
        const myHistory = [...(myData.liked || []), ...(myData.passed || []), ...(myData.matches || [])];
        
        if (theirId !== u.uid && !myHistory.includes(theirId)) {
            feed.push({ id: theirId, ...doc.data() });
        }
      });

      setProfiles(feed);
      setLoading(false);
    };

    init();
  }, []);

  // 2. Handle Swipe Right (Heart)
  const handleLike = async () => {
    const target = profiles[currentCardIndex];
    if (!target) return;

    // A. Check if they liked me first (The Match Check)
    const targetSnap = await getDoc(doc(db, "users", target.id));
    const targetData = targetSnap.data();
    
    // Check if MY ID is in THEIR "liked" array
    const isMatch = targetData.liked?.includes(user.uid);

    if (isMatch) {
        // --- IT'S A MATCH! ---
        triggerMatch(target);
    } else {
        // --- JUST A LIKE ---
        // Add them to my "liked" array
        await updateDoc(doc(db, "users", user.uid), {
            liked: arrayUnion(target.id)
        });
        nextCard();
    }
  };

  // 3. Handle Swipe Left (Pass)
  const handlePass = async () => {
    const target = profiles[currentCardIndex];
    if (!target) return;

    // Add to "passed" array so we never see them again
    await updateDoc(doc(db, "users", user.uid), {
        passed: arrayUnion(target.id)
    });
    nextCard();
  };

  // Helper: Move to next card
  const nextCard = () => {
    setCurrentCardIndex(prev => prev + 1);
  };

  // Helper: Create the Match in DB
  const triggerMatch = async (targetUser) => {
    confetti(); // POP!
    
    // 1. Create a Chat Room
    const chatRef = await addDoc(collection(db, "chats"), {
        users: [user.uid, targetUser.id],
        createdAt: serverTimestamp(),
        lastMessage: "Matched! Say hi."
    });

    // 2. Update BOTH users' match lists
    await updateDoc(doc(db, "users", user.uid), {
        matches: arrayUnion(targetUser.id),
        // We assume we also need to store the chatId somewhere if we want easy access, 
        // but for now we can query it. Simpler to just store match IDs.
    });
    await updateDoc(doc(db, "users", targetUser.id), {
        matches: arrayUnion(user.uid)
    });

    // 3. Show Popup
    setShowMatchPopup({ ...targetUser, chatId: chatRef.id });
  };

  // --- RENDER ---
  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center">Loading Vibes...</div>;
  if (!user) return null;

  const currentProfile = profiles[currentCardIndex];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 relative overflow-hidden">
      
      {/* New Header */}
        <div className="w-full flex justify-between items-center mb-4 max-w-md px-2">
            {/* Left: Profile Icon */}
            <button onClick={() => router.push('/profile')}>
                <img 
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.avatarSeed}`} 
                    className="w-10 h-10 rounded-full border border-purple-500 bg-gray-800"
                />
            </button>

            {/* Center: Logo */}
            <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-2xl tracking-tighter">
                AURA
            </h1>

            {/* Right: Chats */}
            <button onClick={() => router.push('/matches')} className="p-2 bg-gray-900 rounded-full hover:bg-gray-800 border border-gray-800">
                💬
            </button>
        </div>

      {/* MATCH POPUP MODAL */}
      {showMatchPopup && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in">
            <h1 className="text-4xl font-bold text-green-400 mb-2">It's a Match!</h1>
            <p className="text-gray-300 mb-8">You and {showMatchPopup.displayName} liked each other.</p>
            
            <div className="flex gap-4 items-center mb-8">
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.avatarSeed}`} className="w-20 h-20 rounded-full border-2 border-purple-500 bg-white"/>
                <span className="text-2xl">⚡</span>
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${showMatchPopup.avatarSeed}`} className="w-20 h-20 rounded-full border-2 border-pink-500 bg-white"/>
            </div>

            <button 
                onClick={() => router.push(`/chat?id=${showMatchPopup.chatId}`)}
                className="w-full max-w-xs bg-purple-600 py-4 rounded-full font-bold mb-4"
            >
                Send Message
            </button>
            <button 
                onClick={() => { setShowMatchPopup(null); nextCard(); }}
                className="text-gray-500"
            >
                Keep Swiping
            </button>
        </div>
      )}

      {/* THE CARD */}
      {currentProfile ? (
        <div className="w-full max-w-md flex-1 flex flex-col">
            <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative flex-1">
                
                {/* Avatar / Photo Area */}
                <div className="h-2/3 bg-gray-800 flex items-center justify-center relative">
                    <img 
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${currentProfile.avatarSeed}`} 
                        className="w-full h-full object-cover bg-gray-200"
                    />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent h-20"></div>
                </div>

                {/* Details */}
                <div className="p-6">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-3xl font-bold">{currentProfile.displayName}</h2>
                        <span className="text-purple-400 font-mono text-sm">{currentProfile.hostel} • {currentProfile.batch}</span>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex gap-2 mb-4">
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300 border border-gray-700">
                            {currentProfile.campus}
                        </span>
                        {currentProfile.mode === 'MoodIndigo' && (
                            <span className="bg-yellow-900/50 px-3 py-1 rounded-full text-xs text-yellow-400 border border-yellow-600">
                                🎷 MoodI Mode
                            </span>
                        )}
                    </div>

                    <p className="text-gray-400 text-sm line-clamp-3">
                        {currentProfile.bio || "No bio yet. Just mysterious vibes."}
                    </p>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-center gap-6 mt-6 mb-4">
                <button 
                    onClick={handlePass}
                    className="w-16 h-16 rounded-full bg-gray-800 border border-red-500 text-red-500 text-3xl flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                >
                    ✕
                </button>
                <button 
                    onClick={handleLike}
                    className="w-16 h-16 rounded-full bg-gray-800 border border-green-500 text-green-500 text-3xl flex items-center justify-center hover:bg-green-500 hover:text-white transition shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                >
                    ♥
                </button>
            </div>
        </div>
      ) : (
        /* NO CARDS LEFT STATE */
        <div className="flex flex-col items-center justify-center h-2/3 text-center max-w-xs">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold mb-2">That's everyone!</h2>
            <p className="text-gray-400">
                You've viewed all profiles in {user.campus} for now. 
                Change your filters or wait for more people to join.
            </p>
            <button 
                onClick={() => router.reload()}
                className="mt-6 text-purple-400 hover:text-white"
            >
                Refresh
            </button>
        </div>
      )}
    </div>
  );
}