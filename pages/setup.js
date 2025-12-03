import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

const CAMPUS_OPTIONS = ["IIT Bombay"]; 

export default function SetupProfile() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 1. COMPLEX STATE
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    campus: 'IIT Bombay',
    gender: 'Male', 
    orientation: 'Heterosexual', 
    lookingFor: 'Female', 
    batch: '2025',
    mode: 'General', 
    avatarSeed: Math.random().toString(), 
    photoUrl: '', // New field for setup
    completedSetup: true
  });

  // 2. COMPRESSION HELPER
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
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  // 3. IMAGE HANDLER
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

  useEffect(() => {
    const loadData = async () => {
        if(auth.currentUser) {
            const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (docSnap.exists()) {
                setProfile(prev => ({ ...prev, ...docSnap.data() }));
            }
        }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            ...profile,
            email: auth.currentUser.email,
            updatedAt: new Date(),
        }, { merge: true }); 
        
        router.push('/dashboard');
    } catch (e) {
        alert("Error saving profile: " + e.message);
    }
    setLoading(false);
  };

  // --- STEP 1: DISCLAIMER ---
  if (step === 1) return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col justify-center max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-red-500 mb-4">⚠️ The Rules</h1>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 space-y-4 text-gray-300">
            <p>1. <strong>Exclusive:</strong> Aura is currently only for verified students.</p>
            <p>2. <strong>Safety:</strong> Harassment leads to an instant ban.</p>
            <p>3. <strong>Vibe:</strong> Be authentic. Don't be a creep.</p>
        </div>
        <button onClick={() => setStep(2)} className="mt-8 w-full bg-white text-black font-bold py-4 rounded-full hover:scale-105 transition">
            I Agree & Continue
        </button>
    </div>
  );

  // --- STEP 2: IDENTITY ---
  if (step === 2) return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-purple-400">Identity Check</h2>
        
        <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Select Campus</label>
        <select 
            value={profile.campus}
            onChange={e => setProfile({...profile, campus: e.target.value})}
            className="w-full bg-gray-900 border border-purple-500 p-3 rounded mb-6 text-white"
        >
            {CAMPUS_OPTIONS.map(c => <option key={c}>{c}</option>)}
        </select>

        <label className="block text-gray-400 text-sm mb-1">Display Name</label>
        <input 
            value={profile.displayName}
            onChange={e => setProfile({...profile, displayName: e.target.value})}
            className="w-full bg-gray-800 p-3 rounded mb-4 focus:outline-none focus:border-purple-500 border border-transparent"
            placeholder="e.g. Rahul (H12)"
        />

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-gray-400 text-sm mb-1">Gender</label>
                <select 
                    value={profile.gender}
                    onChange={e => setProfile({...profile, gender: e.target.value})}
                    className="w-full bg-gray-800 p-3 rounded mb-4"
                >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-Binary</option>
                </select>
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">Orientation</label>
                <select 
                    value={profile.orientation}
                    onChange={e => setProfile({...profile, orientation: e.target.value})}
                    className="w-full bg-gray-800 p-3 rounded mb-4"
                >
                    <option>Heterosexual</option>
                    <option>Homosexual</option>
                    <option>Bisexual</option>
                    <option>Pansexual</option>
                </select>
            </div>
        </div>

        <label className="block text-gray-400 text-sm mb-1">Interested In</label>
        <select 
            value={profile.lookingFor}
            onChange={e => setProfile({...profile, lookingFor: e.target.value})}
            className="w-full bg-gray-800 p-3 rounded mb-4"
        >
            <option value="Female">Women</option>
            <option value="Male">Men</option>
            <option value="Everyone">Everyone</option>
        </select>

        <button onClick={() => setStep(3)} className="w-full bg-purple-600 font-bold py-3 rounded-full mt-4">
            Next: Build Profile
        </button>
    </div>
  );

  // --- STEP 3: PHOTO & BIO (UPDATED) ---
  if (step === 3) return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Your Aura</h2>
        
        {/* PHOTO UPLOAD UI */}
        <div className="relative group mb-4">
            <img 
                src={profile.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatarSeed}`} 
                alt="avatar"
                className="w-32 h-32 rounded-full border-4 border-purple-500 bg-gray-800 object-cover"
            />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
            >
                <span className="text-xs font-bold">Upload Photo</span>
            </button>
        </div>
        
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

        <div className="flex gap-4 text-sm mb-6">
            <button 
                onClick={() => setProfile({...profile, avatarSeed: Math.random().toString()})}
                className="text-purple-400 hover:underline"
            >
                🎲 Random Avatar
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-400 hover:underline"
            >
                📷 Upload Photo
            </button>
        </div>

        <label className="w-full block text-gray-400 text-sm mb-1">Bio (Make it witty)</label>
        <textarea 
            value={profile.bio}
            onChange={e => setProfile({...profile, bio: e.target.value})}
            className="w-full bg-gray-800 p-3 rounded mb-4 h-24 border border-gray-700 focus:border-purple-500"
            placeholder="Reviewing mess food since 2023..."
        />

        <div className="w-full bg-gray-900 p-4 rounded border border-yellow-600 mb-6">
            <div className="flex justify-between items-center">
                <span className="text-yellow-400 font-bold">Mood Indigo Mode 🎷</span>
                <input 
                    type="checkbox"
                    checked={profile.mode === 'MoodIndigo'}
                    onChange={(e) => setProfile({...profile, mode: e.target.checked ? 'MoodIndigo' : 'General'})}
                    className="w-5 h-5 accent-yellow-400"
                />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enable to find concert partners. Disable for general dating.</p>
        </div>

        <button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold py-3 rounded-full hover:opacity-90 transition"
        >
            {loading ? "Saving..." : "Enter Aura 🚀"}
        </button>
    </div>
  );
}
