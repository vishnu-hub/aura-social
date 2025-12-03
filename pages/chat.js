import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, doc, getDoc, updateDoc, 
  arrayUnion, arrayRemove, deleteDoc 
} from 'firebase/firestore';

// ... (GAMES OBJECT REMAINS SAME) ...
const GAMES = {
    TRUTH: [ // --- Campus Life & Embarrassing ---
        "What is your actual CPI? Don't lie.",
        "Have you ever slept through a quiz?",
        "What is the most embarrassing thing you've done in the Mess?",
        "Have you ever stalked a crush's LinkedIn?",
        "Who is the most attractive person on campus right now?",
        "Have you ever cried in the Library?",
        "What's the weirdest rumor you've heard about yourself?",
        "Have you ever used ChatGPT to write an entire assignment?",
        "Who is your favorite Professor and why?",
        "Have you ever blocked a friend on social media?",
        "What is your biggest red flag?",
        "Have you ever stolen food from the fridge?",
        "What's the longest you've gone without showering during exams?",
        "Have you ever lied to get an extension on a deadline?",
        "What's your worst 'freshie' mistake?",
        "Have you ever snooped through a friend's phone?",
        "What's the pettiest reason you rejected someone?",
        "Have you ever had a crush on a TA?",
        "What's a secret you've never told your parents?",
        "Who in this chat do you think is smarter?",
        
        // --- Dating & Spicy ---
        "Have you ever ghosted someone?",
        "What is your biggest turn-off?",
        "Have you ever been in love?",
        "What's the worst date you've ever been on?",
        "Do you believe in 'right person, wrong time'?",
        "Have you ever sent a risky text and regretted it?",
        "What's your opinion on open relationships?",
        "Have you ever drunk dialed an ex?",
        "What is the first thing you notice about a person?",
        "Have you ever led someone on just for attention?",
        "What's your body count? (Optional)",
        "Do you think you are a good kisser?",
        "Have you ever dated a friend's ex?",
        "What's your guilty pleasure song?",
        "If you could get back with an ex, would you?",
        "What's the most romantic thing you've done?",
        "Have you ever friend-zoned someone who liked you?",
        "What is your ideal date night?",
        "Have you ever posted a story just for one person to see?",
        "What's the most toxic trait you have in relationships?",
        
        // --- Random & Fun ---
        "If you were invisible for a day, what would you do?",
        "What's the most expensive thing you've broken?",
        "Have you ever been caught cheating in an exam?",
        "What's a movie you love that everyone hates?",
        "If you could swap lives with anyone on campus, who would it be?",
        "What's the last thing you Googled?",
        "Have you ever peed in a swimming pool?",
        "What's your biggest irrational fear?",
        "If you could drop out right now with $10 Million, would you?",
        "What's the weirdest dream you've ever had?"],

    DARE: [
        // --- Digital Dares ---
        "Send the 5th photo in your gallery. No cheating.",
        "Send a screenshot of your screen time usage.",
        "Voice note yourself singing a Bollywood song.",
        "Text your parents 'I'm getting married' and send a screenshot.",
        "Change your WhatsApp DP to a monkey for 10 minutes.",
        "Reply to my next 5 messages using only emojis.",
        "Send a selfie from a really low angle (double chin mode).",
        "Send a screenshot of your recent YouTube search history.",
        "Text your crush (or a random friend) 'I know what you did'.",
        "Record yourself doing a fake accent for 10 seconds.",
        "Send the last meme you saved.",
        "Like the first 5 posts on your ex's Instagram (or a random person).",
        "Send a screenshot of your DMs with your best friend.",
        "Google 'Feet pics' and send a screenshot of the result.",
        "Send a voice note saying the alphabet backwards.",
        "Text your wingmate 'I think I'm in love with you'.",
        "Send a photo of what you are wearing right now.",
        "Let me choose your bio for the next 24 hours.",
        "Send a screenshot of your bank balance (blur the numbers if you want).",
        "Send a video of you doing 10 pushups.",

        // --- Physical/Campus Dares (If meeting) ---
        "Yell 'I love Mood Indigo' out of your window right now.",
        "Do a plank for 1 minute while voice noting.",
        "Wear your t-shirt inside out for the next hour.",
        "Draw a mustache on your face and send a selfie.",
        "Drink a glass of water without using your hands.",
        "Talk without closing your mouth for the next voice note.",
        "Spin around 10 times and try to walk straight (send video).",
        "Put an ice cube down your shirt.",
        "Eat a spoon of chili powder (or something spicy).",
        "Do your best impression of a famous Professor.",
        
        // --- Wild Card ---
        "Let me ask you ANY question and you must answer truthfully.",
        "Send the most embarrassing photo of yourself you have.",
        "Type your name with your nose.",
        "Send a voice note whispering a secret.",
        "Close your eyes and type a sentence.",
        "Send a screenshot of your alarm clock settings.",
        "Go to your building group chat and type 'Who wants to fight?'.",
        "Send a photo of your messy room.",
        "Bark like a dog in a voice note.",
        "Read the last text you sent to your mom out loud."
    ],
    DEEP: [
        // --- Existential & Future ---
        "What keeps you up at night?",
        "Do you think you are on the right path in life?",
        "What is your biggest fear about the future?",
        "If you died tomorrow, what would be your biggest regret?",
        "Do you believe in soulmates?",
        "What does 'success' actually mean to you?",
        "Ideally, where do you see yourself in 10 years?",
        "What is one thing you would change about the world?",
        "Do you believe everything happens for a reason?",
        "What is the meaning of life in 3 words?",
        
        // --- Personal & Emotional ---
        "What's the hardest goodbye you've ever said?",
        "When was the last time you truly felt happy?",
        "What is one thing you wish you could tell your younger self?",
        "Do you think you are a good person?",
        "What is the loneliest you've ever felt?",
        "What is a memory you wish you could erase?",
        "Who is the one person you can't imagine life without?",
        "What is a compliment you received that stuck with you?",
        "Have you ever lost a friend? Why?",
        "What makes you cry?",
        
        // --- Connection ---
        "What is your love language?",
        "What is the most important quality in a partner?",
        "Could you forgive a cheater?",
        "Do you think men and women can purely be friends?",
        "What is a deal-breaker for you in a relationship?",
        "Do you want to get married one day?",
        "What is your relationship with your parents like?",
        "What is something you crave more than anything else?",
        "If you could relive one day of your life, which one would it be?",
        "What is the bravest thing you've ever done?"
    ]
};

export default function Chat() {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const dummy = useRef();
  const fileInputRef = useRef(null);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scaleFactor = 800 / Math.max(img.width, img.height);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    // --- NEW: MARK AS READ (Remove me from unreadBy) ---
    const markAsRead = async () => {
        try {
            await updateDoc(doc(db, "chats", id), {
                unreadBy: arrayRemove(auth.currentUser.uid)
            });
        } catch (e) { console.error(e); }
    };
    markAsRead();

    // Fetch Header
    const fetchHeaderData = async () => {
        try {
            const chatRef = doc(db, "chats", id);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const users = chatSnap.data().users;
                const otherUserId = users.find(u => u !== auth.currentUser.uid);
                const userSnap = await getDoc(doc(db, "users", otherUserId));
                if (userSnap.exists()) setOtherUser({ uid: otherUserId, ...userSnap.data() });
            }
        } catch (e) { console.error(e); }
    };
    fetchHeaderData();

    // Listen for Messages
    const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      dummy.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [id]);

  // HELPER: Notify other user on new message
  const updateUnreadStatus = async () => {
      if (!otherUser) return;
      await updateDoc(doc(db, "chats", id), {
          unreadBy: arrayUnion(otherUser.uid)
      });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", id, "messages"), {
      text: newMessage,
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      type: 'text'
    });
    
    updateUnreadStatus(); // <--- Add Badge for them
    setNewMessage("");
    setShowGameMenu(false);
  };

  const handleImageSend = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
        const compressedBase64 = await compressImage(file);
        await addDoc(collection(db, "chats", id, "messages"), {
            imageUrl: compressedBase64,
            senderId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            type: 'image'
        });
        updateUnreadStatus(); // <--- Add Badge for them
    } catch (error) { alert("Failed to send image"); }
    setSending(false);
  };

  const handleSendGame = async (category) => {
      const questions = GAMES[category];
      const randomQ = questions[Math.floor(Math.random() * questions.length)];
      
      await addDoc(collection(db, "chats", id, "messages"), {
          text: randomQ,
          category: category, 
          senderId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          type: 'game'
      });
      
      updateUnreadStatus(); // <--- Add Badge for them
      setShowGameMenu(false);
  };

  const handleBlock = async () => {
      if(!confirm(`Block ${otherUser?.displayName}? Chat history will be deleted.`)) return;
      try {
          const myId = auth.currentUser.uid;
          await updateDoc(doc(db, "users", myId), {
              blocked: arrayUnion(otherUser.uid),
              matches: arrayRemove(otherUser.uid)
          });
          await deleteDoc(doc(db, "chats", id));
          alert("User blocked.");
          router.push('/dashboard');
      } catch (e) { alert("Error blocking: " + e.message); }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative">
      
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
            <button onClick={() => router.push('/matches')} className="text-gray-400 hover:text-white text-xl">←</button>
            {otherUser ? (
                <div className="flex items-center gap-3">
                    <img 
                        src={otherUser.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${otherUser.avatarSeed || 'default'}`}
                        className="w-10 h-10 rounded-full border border-purple-500 bg-gray-800 object-cover"
                    />
                    <h2 className="font-bold text-lg">{otherUser.displayName}</h2>
                </div>
            ) : <h2 className="font-bold text-lg text-gray-500">Loading...</h2>}
        </div>
        <button onClick={handleBlock} className="text-red-500 bg-red-500/10 px-3 py-2 rounded-lg text-sm font-bold border border-red-500/50 hover:bg-red-500 hover:text-white transition">🚫 Block</button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black" onClick={() => setShowGameMenu(false)}>
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          
          if (msg.type === 'game') {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                    <div className="bg-gray-900 border border-purple-500 rounded-xl p-4 w-full max-w-xs text-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <span className="text-xs font-bold text-purple-400 tracking-widest uppercase">{msg.category}</span>
                        <p className="text-lg font-bold text-white mt-1">"{msg.text}"</p>
                        <p className="text-xs text-gray-500 mt-2">{isMe ? "You asked this." : "Your turn to answer!"}</p>
                    </div>
                </div>
              );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}>
                {msg.type === 'image' ? (
                    <img src={msg.imageUrl} className="w-full max-w-[250px] object-cover" />
                ) : (
                    <div className="px-4 py-2">{msg.text}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={dummy}></div>
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2 items-center relative">
        {showGameMenu && (
            <div className="absolute bottom-16 left-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-2 w-48 flex flex-col gap-2 animate-in slide-in-from-bottom-5">
                <button type="button" onClick={() => handleSendGame('TRUTH')} className="p-3 bg-blue-900/50 hover:bg-blue-900 text-blue-200 rounded-lg font-bold text-left">😇 Truth</button>
                <button type="button" onClick={() => handleSendGame('DARE')} className="p-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-lg font-bold text-left">😈 Dare</button>
                <button type="button" onClick={() => handleSendGame('DEEP')} className="p-3 bg-purple-900/50 hover:bg-purple-900 text-purple-200 rounded-lg font-bold text-left">🌌 Deep Talk</button>
            </div>
        )}

        <button type="button" onClick={() => setShowGameMenu(!showGameMenu)} className="p-3 bg-gray-800 rounded-full text-purple-400 hover:text-white hover:bg-purple-600 transition border border-gray-700">🎲</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white transition" disabled={sending}>{sending ? "⏳" : "📷"}</button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSend} />
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 text-white p-3 rounded-full focus:outline-none focus:border-purple-500" placeholder="Message..." />
        <button type="submit" disabled={!newMessage.trim()} className="bg-purple-600 text-white p-3 rounded-full px-6 font-bold">➤</button>
      </form>
    </div>
  );
}