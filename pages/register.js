import { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    pseudoName: '', 
    gender: 'Male', 
    lookingFor: 'Female', 
    batch: '2025', // Replaced "Year" with "Batch" (more scalable)
    primaryInterest: 'Techno', // Generic name for Music/Interest
    eventAvailability: 'Day 1', // Generic name for Pronite
    hostel: 'H1', 
    whatsapp: '' 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!auth.currentUser) return;
    setLoading(true);

    try {
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            ...formData,
            email: auth.currentUser.email,
            status: 'unmatched',
            createdAt: new Date()
        });
        router.push('/dashboard'); 
    } catch (error) {
        console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-purple-400">Create your Aura</h2>
        
        <input 
            type="text" 
            placeholder="Choose a Code Name (e.g. NightOwl)"
            className="w-full mb-4 p-3 rounded bg-gray-700 border border-gray-600 focus:border-purple-500 outline-none"
            onChange={(e) => setFormData({...formData, pseudoName: e.target.value})}
            required
        />

        {/* Dynamic Selectors for Scalability */}
        <label className="text-xs text-gray-400 uppercase">Vibe Check</label>
        <div className="grid grid-cols-2 gap-4 mb-4 mt-1">
            <select 
                className="p-3 rounded bg-gray-700 border border-gray-600"
                onChange={(e) => setFormData({...formData, primaryInterest: e.target.value})}
            >
                <option>Techno / EDM</option>
                <option>Bollywood</option>
                <option>Rock / Metal</option>
                <option>Indie / Pop</option>
            </select>

            <select 
                className="p-3 rounded bg-gray-700 border border-gray-600"
                onChange={(e) => setFormData({...formData, eventAvailability: e.target.value})}
            >
                <option>Day 1 (Fri)</option>
                <option>Day 2 (Sat)</option>
                <option>Day 3 (Sun)</option>
                <option>Day 4 (Mon)</option>
            </select>
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 font-bold py-3 rounded-xl hover:opacity-90 transition"
        >
            Enter the Network
        </button>
      </form>
    </div>
  );
}