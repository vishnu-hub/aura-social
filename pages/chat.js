import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function Chat() {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null); // Store the full profile of the match
  const dummy = useRef();

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    // 1. Fetch the "Other User" details for the Header
    const fetchHeaderData = async () => {
        try {
            const chatRef = doc(db, "chats", id);
            const chatSnap = await getDoc(chatRef);
            
            if (chatSnap.exists()) {
                const users = chatSnap.data().users;
                const otherUserId = users.find(u => u !== auth.currentUser.uid);
                
                const userSnap = await getDoc(doc(db, "users", otherUserId));
                if (userSnap.exists()) {
                    setOtherUser(userSnap.data());
                }
            }
        } catch (e) {
            console.error("Error fetching header:", e);
        }
    };
    fetchHeaderData();

    // 2. Listen for Messages
    const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      dummy.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", id, "messages"), {
      text: newMessage,
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header with REAL PHOTO */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center sticky top-0 z-10">
        <button onClick={() => router.push('/matches')} className="text-gray-400 hover:text-white mr-4 text-xl">
          ←
        </button>
        
        {otherUser ? (
            <div className="flex items-center gap-3">
                <img 
                    src={otherUser.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${otherUser.avatarSeed || 'default'}`}
                    className="w-10 h-10 rounded-full border border-purple-500 bg-gray-800 object-cover"
                />
                <h2 className="font-bold text-lg">{otherUser.displayName}</h2>
            </div>
        ) : (
            <h2 className="font-bold text-lg">Loading...</h2>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
                <p>It's a match! Say hello. 👋</p>
            </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                isMe 
                ? 'bg-purple-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={dummy}></div>
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-gray-900 border-t border-gray-800 flex gap-2">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white p-3 rounded-full focus:outline-none focus:border-purple-500"
          placeholder="Type a message..."
        />
        <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-purple-600 text-white p-3 rounded-full px-6 font-bold disabled:opacity-50 hover:bg-purple-500 transition"
        >
            Send
        </button>
      </form>
    </div>
  );
}