// pages/chat.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function Chat() {
  const router = useRouter();
  const { id } = router.query; // Get chat ID from URL
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [matchName, setMatchName] = useState("Match");
  const dummy = useRef(); // Auto-scroll to bottom

  useEffect(() => {
    if (!id || !auth.currentUser) return;

    // 1. Get Match Name (Optional, but looks nice)
    const fetchMatchName = async () => {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            setMatchName(userDoc.data().matchName || "Your Match");
        }
    };
    fetchMatchName();

    // 2. Listen for Messages (Real-time)
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
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white">
          ← Back
        </button>
        <h2 className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
          {matchName}
        </h2>
        <div className="w-8"></div> {/* Spacer for centering */}
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