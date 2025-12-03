import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';

export default function Chat() {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [sending, setSending] = useState(false);
  const dummy = useRef();
  const fileInputRef = useRef(null);

  // 1. COMPRESSION LOGIC
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

  // 2. FETCH DATA & LISTEN
  useEffect(() => {
    if (!id || !auth.currentUser) return;

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

    const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      dummy.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [id]);

  // 3. SEND MESSAGES
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

  // 4. THE MISSING BLOCK FUNCTION (This fixes the error)
  const handleBlock = async () => {
      if(!confirm(`Block ${otherUser?.displayName}? Chat history will be deleted.`)) return;

      try {
          const myId = auth.currentUser.uid;
          
          // 1. Add to Blocked List (So they don't show up in Feed again)
          await updateDoc(doc(db, "users", myId), {
              blocked: arrayUnion(otherUser.uid),
              matches: arrayRemove(otherUser.uid)
          });

          // 2. DELETE THE CHAT (This makes you disappear from THEIR list too)
          await deleteDoc(doc(db, "chats", id));

          alert("User blocked.");
          router.push('/dashboard');
      } catch (e) {
          alert("Error blocking: " + e.message);
      }
  };

  // 5. RENDER
  return (
    <div className="flex flex-col h-screen bg-black text-white relative">
      
      {/* HEADER with RED BLOCK BUTTON */}
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

        <button 
            onClick={handleBlock}
            className="text-red-500 bg-red-500/10 px-3 py-2 rounded-lg text-sm font-bold border border-red-500/50 hover:bg-red-500 hover:text-white transition"
        >
            🚫 Block
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
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

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2 items-center">
        <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
            disabled={sending}
        >
            {sending ? "⏳" : "📷"}
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSend} />

        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white p-3 rounded-full focus:outline-none focus:border-purple-500"
          placeholder="Message..."
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-purple-600 text-white p-3 rounded-full px-6 font-bold">➤</button>
      </form>
    </div>
  );
}