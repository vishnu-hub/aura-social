import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // SCALABILITY CHECK: Change this line later to expand
      /*
      if (!user.email.endsWith('iitb.ac.in')) {
         await auth.signOut();
         alert("Access Restricted: IIT Bombay Students Only (for now).");
         return;
      }
      */

      // Check if user exists
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().completedSetup) {
        router.push('/dashboard');
      } else {
        // Otherwise, send them to the new Wizard
        router.push('/setup'); 
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
      {/* Branding */}
      <h1 className="text-5xl font-bold mb-2 tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
        AURA
      </h1>
      <p className="mb-8 text-gray-400">The social network for the walled garden.</p>
      
      <button 
        onClick={handleLogin}
        className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition transform"
      >
        Sign in
      </button>
    </div>
  );
};