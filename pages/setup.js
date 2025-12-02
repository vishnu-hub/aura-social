import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

// SCALABILITY: Add new colleges here later
const CAMPUS_OPTIONS = ["IIT Bombay"]; 

export default function SetupProfile() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // COMPLEX STATE for a robust profile
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    campus: 'IIT Bombay', // Default locked to IITB for now
    gender: 'Male', 
    orientation: 'Heterosexual', 
    lookingFor: 'Female', 
    batch: '2025',
    hostel: 'H1',
    mode: 'General', 
    interests: [], 
    avatarSeed: Math.random().toString(), 
    completedSetup: true
  });

  // Load existing data if editing
  useEffect(() => {
    const loadData = async () => {
        if(auth.currentUser) {
            const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (docSnap.exists()) {
                setProfile({ ...profile, ...docSnap.data() });
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
            email: auth.currentUser.email, // Save email for admin verification
            updatedAt: new Date(),
        }, { merge: true }); 
        
        router.push('/dashboard');
    } catch (e) {
        alert("Error saving profile: " + e.message);
    }
    setLoading(false);
  };

  // --- STEP 1: THE DISCLAIMER ---
  if (step === 1) return (
    <div className="min-h-screen bg-black text-white p-8 flex flex-col justify-center max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-red-500 mb-4">⚠️ The Rules</h1>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 space-y-4 text-gray-300">
            <p>1. <strong>Exclusive:</strong> Aura is currently only for verified students of the campuses listed.</p>
            <p>2. <strong>Safety:</strong> Harassment leads to an instant ban. We log IP addresses.</p>
            <p>3. <strong>Vibe:</strong> Be authentic. Don't be a creep.</p>
        </div>
        <button onClick={() => setStep(2)} className="mt-8 w-full bg-white text-black font-bold py-4 rounded-full hover:scale-105 transition">
            I Agree & Continue
        </button>
    </div>
  );

  // --- STEP 2: IDENTITY & CAMPUS ---
  if (step === 2) return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-purple-400">Identity Check</h2>
        
        {/* NEW: CAMPUS SELECTOR */}
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

  // --- STEP 3: CREATIVITY & AVATAR ---
  if (step === 3) return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Your Aura</h2>
        
        <img 
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile.avatarSeed}`} 
            alt="avatar"
            className="w-32 h-32 rounded-full border-4 border-purple-500 mb-4 bg-white"
        />
        <button 
            onClick={() => setProfile({...profile, avatarSeed: Math.random().toString()})}
            className="text-sm text-purple-400 mb-6 hover:underline"
        >
            🎲 Randomize Avatar
        </button>

        <label className="w-full block text-gray-400 text-sm mb-1">Bio (Make it witty)</label>
        <textarea 
            value={profile.bio}
            onChange={e => setProfile({...profile, bio: e.target.value})}
            className="w-full bg-gray-800 p-3 rounded mb-4 h-24 border border-gray-700 focus:border-purple-500"
            placeholder="Reviewing mess food since 2023. Looking for someone to attend Pronite with."
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