import admin from 'firebase-admin';

// Inisialisasi Firebase Admin SDK (Menggunakan kunci rahasia Vercel)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

export default async function handler(req, res) {
    // 1. Kunci metode hanya untuk POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { uid, correct, dbName } = req.body;

        if (!uid) {
            return res.status(400).json({ success: false, message: 'UID tidak ditemukan!' });
        }

        // 2. Hitung kelipatan poin secara aman di SERVER (Sisi Klien tidak bisa manipulasi)
        const LEVEL_MULTIPLIERS = { 
            'lv1': 1, 
            'tajwid': 1.5, 
            'shorof': 2, 
            'lv2': 3, 
            'alfiyah-isim': 4, 
            'alfiyah-fiil': 5 
        };
        
        const multiplier = LEVEL_MULTIPLIERS[dbName] || 1;
        let poinDapat = Math.round((correct || 0) * multiplier);
        
        // Kunci batas maksimal +3 poin per penyelesaian kuis
        const skorAman = Math.min(poinDapat, 3); 

        if (skorAman <= 0) {
            return res.status(200).json({ success: true, addedScore: 0, message: 'Tidak ada poin didapat.' });
        }

        // 3. Update total_score & last_played di Realtime Database via Admin SDK
        const db = admin.database();
        const userRef = db.ref(`users/${uid}/total_score`);

        await userRef.transaction((currentScore) => {
            return (currentScore || 0) + skorAman;
        });

        await db.ref(`users/${uid}/last_played`).set(Date.now());

        return res.status(200).json({ 
            success: true, 
            addedScore: skorAman,
            message: `Berhasil menambahkan +${skorAman} poin ke database!` 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
