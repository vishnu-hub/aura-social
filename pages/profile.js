import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove, getDocs, query, collection, where, documentId } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';

export default function Profile() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedList, setBlockedList] = useState([]); 
  
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    campus: 'IIT Bombay',
    gender: 'Male', 
    lookingFor: 'Female', 
    mode: 'General', 
    avatarSeed: 'default',
    photoUrl: '',
    blocked: [] 
  });

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
    const fetchProfile = async () => {
      if (!auth.currentUser) return router.push('/');

      try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            setProfile(prev => ({
                ...prev, 
                ...data,
                photoUrl: data.photoUrl || '', 
                avatarSeed: data.avatarSeed || prev.avatarSeed || 'default',
                blocked: data.blocked || []
            }));

            if (data.blocked && data.blocked.length > 0) {
                const q = query(collection(db, "users"), where(documentId(), "in", data.blocked));
                const blockedSnaps = await getDocs(q);
                const loadedBlocked = [];
                blockedSnaps.forEach(snap => {
                    loadedBlocked.push({ uid: snap.id, ...snap.data() });
                });
                setBlockedList(loadedBlocked);
            }
          }
      } catch (e) {
          console.error("Profile load error:", e);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        return;
    }

    try {
        const compressedBase64 = await compressImage(file);
        setProfile(prev => ({ ...prev, photoUrl: compressedBase64 }));
    } catch (error) {
        console.error("Compression failed:", error);
    }
  };

  const handleRemovePhoto = () => {
      setProfile(prev => ({ ...prev, photoUrl: '' }));
  };

  // --- THE CORRECTED UNBLOCK LOGIC ---
  const handleUnblock = async (targetUid) => {
      // 1. Remove from Visual List (UI)
      setBlockedList(prevList => prevList.filter(user => user.uid !== targetUid));

      // 2. Remove from Form Data State (Crucial Step!)
      // This ensures that when you click 'Save', you don't re-add them.
      setProfile(prev => ({
          ...prev,
          blocked: prev.blocked.filter(id => id !== targetUid)
      }));

      try {
          // 3. Remove from Database immediately
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
              blocked: arrayRemove(targetUid),
              passed: arrayRemove(targetUid),
              liked: arrayRemove(targetUid)
          });
      } catch (e) {
          alert("Error updating database: " + e.message);
          router.reload();
      }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if(!auth.currentUser) return;
      
      const safeProfile = {
        ...profile,
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, "users", auth.currentUser.uid), safeProfile);
      router.push('/dashboard'); 
    } catch (e) {
      alert("Save Failed: " + e.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Reloading...</div>;

  const displayImage = profile.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatarSeed}`;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-lg">← Back</button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
        <button onClick={handleLogout} className="text-red-500 text-sm border border-red-500 px-3 py-1 rounded-full">Logout</button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* IMAGE */}
        <div className="flex flex-col items-center">
            <div className="relative group">
                <img 
                    src={displayImage} 
                    className="w-32 h-32 rounded-full border-4 border-purple-600 bg-gray-800 object-cover"
                    alt="Profile"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                    <span className="text-xs font-bold">Change</span>
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <div className="flex gap-4 mt-3 text-sm">
                <button onClick={() => setProfile(prev => ({...prev, avatarSeed: Math.random().toString()}))} className="text-purple-400 hover:underline">🎲 New Avatar</button>
                {profile.photoUrl && <button onClick={handleRemovePhoto} className="text-red-500 hover:underline border-l border-gray-700 pl-4">🗑️ Remove Photo</button>}
            </div>
        </div>

        {/* INPUTS */}
        <div>
            <label className="text-gray-500 text-xs uppercase font-bold">Display Name</label>
            <input value={profile.displayName || ''} onChange={e => setProfile({...profile, displayName: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-3 rounded mt-1 outline-none focus:border-purple-500"/>
        </div>
        <div>
            <label className="text-gray-500 text-xs uppercase font-bold">Bio</label>
            <textarea value={profile.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-3 rounded mt-1 h-24 outline-none focus:border-purple-500"/>
        </div>

        {/* SETTINGS */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h3 className="text-purple-400 font-bold mb-4">Settings</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="text-gray-500 text-xs">I am</label>
                    <select 
                        value={profile.gender}
                        onChange={e => setProfile({...profile, gender: e.target.value})}
                        className="w-full bg-black p-2 rounded mt-1 border border-gray-700"
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-Binary</option>
                    </select>
                </div>
                <div>
                    <label className="text-gray-500 text-xs">Looking For</label>
                    <select 
                        value={profile.lookingFor}
                        onChange={e => setProfile({...profile, lookingFor: e.target.value})}
                        className="w-full bg-black p-2 rounded mt-1 border border-gray-700"
                    >
                        <option value="Female">Women</option>
                        <option value="Male">Men</option>
                        <option value="Everyone">Everyone</option>
                    </select>
                </div>
            </div>
             <div className="flex justify-between items-center bg-black p-3 rounded border border-yellow-800/50">
                <div>
                    <span className="text-yellow-400 font-bold block">Mood Indigo Mode 🎷</span>
                    <span className="text-gray-500 text-xs">Find concert dates</span>
                </div>
                <input 
                    type="checkbox"
                    checked={profile.mode === 'MoodIndigo'}
                    onChange={(e) => setProfile({...profile, mode: e.target.checked ? 'MoodIndigo' : 'General'})}
                    className="w-6 h-6 accent-yellow-400"
                />
            </div>
        </div>

        {/* BLOCKED USERS */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mt-6">
            <h3 className="text-red-400 font-bold mb-4 text-sm uppercase">Blocked Users</h3>
            
            {blockedList.length === 0 ? (
                <p className="text-gray-500 text-sm italic">You haven't blocked anyone.</p>
            ) : (
                <div className="space-y-3">
                    {blockedList.map(blockedUser => (
                        <div key={blockedUser.uid} className="flex justify-between items-center bg-black p-3 rounded border border-gray-800">
                            <span className="font-bold text-sm text-gray-300">{blockedUser.displayName || "Unknown"}</span>
                            <button 
                                onClick={() => handleUnblock(blockedUser.uid)}
                                className="text-xs bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 hover:bg-gray-700"
                            >
                                Unblock
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full bg-white text-black font-bold py-4 rounded-full text-lg hover:scale-105 transition sticky bottom-4 shadow-xl mt-6">
            {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}