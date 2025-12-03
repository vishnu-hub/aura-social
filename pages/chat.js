import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function Chat() {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [sending, setSending] = useState(false); // To show loading state
  const dummy = useRef();
  const fileInputRef = useRef(null);

  // 1. REUSE THE COMPRESSION LOGIC (HD Quality)
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

    // Fetch Other User Header
    const fetchHeaderData = async () => {
        try {
            const chatRef = doc(db, "chats", id);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const users = chatSnap.data().users;
                const otherUserId = users.find(u => u !== auth.currentUser.uid);
                const userSnap = await getDoc(doc(db, "users", otherUserId));
                if (userSnap.exists()) setOtherUser(userSnap.data());
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

  // 2. SEND TEXT MESSAGE
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", id, "messages"), {
      text: newMessage,
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      type: 'text'
    });
    setNewMessage("");
  };

  // 3. SEND IMAGE MESSAGE
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
    } catch (error) {
        alert("Failed to send image");
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => router.push('/matches')} className="text-gray-400 hover:text-white mr-4 text-xl">←</button>
        {otherUser ? (
            <div className="flex items-center gap-3">
                <img 
                    src={otherUser.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${otherUser.avatarSeed || 'default'}`}
                    className="w-10 h-10 rounded-full border border-purple-500 bg-gray-800 object-cover"
                />
                <h2 className="font-bold text-lg">{otherUser.displayName}</h2>
            </div>
        ) : <h2 className="font-bold text-lg">Loading...</h2>}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {messages.length === 0 && (
            <div className="text-center text-gray-600 mt-10 text-sm">
                <p>Start the conversation with a pic 📸</p>
            </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'
              }`}>
                {/* RENDER LOGIC: Text vs Image */}
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
      <form onSubmit={sendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2 items-center">
        
        {/* IMAGE BUTTON */}
        <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
            disabled={sending}
        >
            {sending ? "⏳" : "📷"}
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSend} />

        {/* TEXT INPUT */}
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white p-3 rounded-full focus:outline-none focus:border-purple-500"
          placeholder="Message..."
        />
        
        <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="bg-purple-600 text-white p-3 rounded-full px-6 font-bold disabled:opacity-50 hover:bg-purple-500 transition"
        >
            ➤
        </button>
      </form>
    </div>
  );
}