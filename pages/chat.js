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
    TRUTH: [ "What's your biggest red flag?", "Embarrassing IITB moment?", "Ever ghosted someone?", "Secret you've never told?", "Campus crush?" ],
    DARE: [ "Send 5th photo in gallery.", "Voice note singing.", "Send funny selfie.", "Text parents 'I'm getting married'.", "Reply with emojis only." ],
    DEEP: [ "Biggest fear?", "One thing you'd change?", "Soulmates?", "Loneliest moment?", "Relive one day?" ]
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