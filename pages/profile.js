import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';

const CAMPUS_OPTIONS = ["IIT Bombay"]; 

export default function Profile() {
  const router = useRouter();
  const fileInputRef = useRef(null); // Reference to the hidden file input
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    campus: 'IIT Bombay',
    gender: 'Male', 
    lookingFor: 'Female', 
    mode: 'General', 
    avatarSeed: '',
    photoUrl: '' // NEW: This will store the Real Photo string
  });

  // 1. Load Data
  useEffect(() => {
    const fetchProfile = async () => {
      const u = auth.currentUser;
      if (!u) return router.push('/');

      const docSnap = await getDoc(doc(db, "users", u.uid));
      if (docSnap.exists()) {
        setProfile({ ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // 2. Handle Image Selection (The "Hack")
  // --- ADD THIS HELPER FUNCTION OUTSIDE OR INSIDE YOUR COMPONENT ---
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Limit resolution to 300px (enough for an avatar)
          const scaleFactor = 300 / Math.max(img.width, img.height);
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Compress to JPEG at 70% quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  // --- REPLACE YOUR OLD handleImageUpload WITH THIS ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Basic Validation
    if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        return;
    }

    try {
        // 2. Compress the image (No matter how big the original is)
        const compressedBase64 = await compressImage(file);
        
        // 3. Save to State
        setProfile({ ...profile, photoUrl: compressedBase64 });
    } catch (error) {
        console.error("Compression failed:", error);
        alert("Could not process image. Try a different one.");
    }
  };

  // 3. Save Changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const u = auth.currentUser;
      await updateDoc(doc(db, "users", u.uid), {
        ...profile,
        updatedAt: new Date()
      });
      router.push('/dashboard'); 
    } catch (e) {
      alert("Error: " + e.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-lg">← Back</button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
        <button onClick={handleLogout} className="text-red-500 text-sm border border-red-500 px-3 py-1 rounded-full">
            Logout
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* PHOTO UPLOAD SECTION */}
        <div className="flex flex-col items-center">
            {/* Show Real Photo OR Avatar */}
            <div className="relative group">
                <img 
                    src={profile.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatarSeed}`} 
                    className="w-32 h-32 rounded-full border-4 border-purple-600 bg-gray-800 object-cover"
                />
                
                {/* Overlay Button */}
                <button 
                    onClick={() => fileInputRef.current.click()}
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                    <span className="text-xs font-bold">Change Photo</span>
                </button>
            </div>

            {/* Hidden Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Avatar Fallback Button */}
            {!profile.photoUrl && (
                <button 
                    onClick={() => setProfile({...profile, avatarSeed: Math.random().toString()})}
                    className="text-purple-400 text-sm hover:underline mt-2"
                >
                    Or roll a random avatar 🎲
                </button>
            )}
             {profile.photoUrl && (
                <button 
                    onClick={() => setProfile({...profile, photoUrl: ''})} // Remove photo
                    className="text-red-400 text-sm hover:underline mt-2"
                >
                    Remove Photo
                </button>
            )}
        </div>

        {/* Basic Info Inputs */}
        <div>
            <label className="text-gray-500 text-xs uppercase font-bold">Display Name</label>
            <input 
                value={profile.displayName}
                onChange={e => setProfile({...profile, displayName: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-3 rounded mt-1 outline-none focus:border-purple-500"
            />
        </div>

        <div>
            <label className="text-gray-500 text-xs uppercase font-bold">Bio</label>
            <textarea 
                value={profile.bio}
                onChange={e => setProfile({...profile, bio: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-3 rounded mt-1 h-24 outline-none focus:border-purple-500"
            />
        </div>

        {/* Settings */}
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

        <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black font-bold py-4 rounded-full text-lg hover:scale-105 transition sticky bottom-4 shadow-xl"
        >
            {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}