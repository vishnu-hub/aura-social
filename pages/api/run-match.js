import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  // We removed the "POST ONLY" restriction so you can run this easily in a browser tab
  
  try {
    // 1. Get all unmatched users
    const q = query(collection(db, "users"), where("status", "==", "unmatched"));
    const snapshot = await getDocs(q);
    
    let users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    const matches = [];

    // Shuffle users for randomness
    users = users.sort(() => Math.random() - 0.5);

    console.log(`Found ${users.length} waiting users.`);

    while (users.length > 1) {
      const currentUser = users.pop();
      let bestMatchIndex = -1;
      let highestScore = -1;

      // Find best match
      for (let i = 0; i < users.length; i++) {
        const candidate = users[i];
        let score = 0;

        // Simple Matching Logic
        if (currentUser.eventAvailability === candidate.eventAvailability) score += 50; // Same Day
        if (currentUser.primaryInterest === candidate.primaryInterest) score += 30; // Same Music
        
        // If score is good, pick them
        if (score > highestScore) {
          highestScore = score;
          bestMatchIndex = i;
        }
      }

      // If a match is found (even a low score match is better than no match)
      if (bestMatchIndex > -1) {
        const match = users.splice(bestMatchIndex, 1)[0];
        
        // Create a Chat ID
        const chatId = `${currentUser.id}_${match.id}`;
        
        // Create the Chat Room in DB
        await addDoc(collection(db, "chats"), {
            users: [currentUser.id, match.id],
            createdAt: serverTimestamp()
        });

        // Update User A
        await updateDoc(doc(db, "users", currentUser.id), { 
            status: 'matched', 
            matchId: match.id, 
            chatId: chatId,
            matchName: match.pseudoName 
        });

        // Update User B
        await updateDoc(doc(db, "users", match.id), { 
            status: 'matched', 
            matchId: currentUser.id, 
            chatId: chatId,
            matchName: currentUser.pseudoName
        });
        
        matches.push(`${currentUser.pseudoName} ❤️ ${match.pseudoName}`);
      }
    }

    res.status(200).json({ 
        message: "Matching Run Complete", 
        matchesGenerated: matches,
        waitingUsers: users.length 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}