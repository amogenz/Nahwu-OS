import admin from 'firebase-admin';

// Inisialisasi Firebase Admin SDK (Menggunakan kunci rahasia Vercel)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

const LEVEL_MULTIPLIERS = {
    'lv1': 1,
    'tajwid': 1.5,
    'shorof': 2,
    'lv2': 3,
    'alfiyah-isim': 4,
    'alfiyah-fiil': 5
};

// Jarak minimal antar submit yang diizinkan per user (ms).
// Menyesuaikan estimasi waktu wajar untuk menyelesaikan 1 sesi kuis.
const MIN_SUBMIT_INTERVAL_MS = 15 * 1000; // 15 detik

export default async function handler(req, res) {
    // 1. Kunci metode hanya untuk POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        // ==========================================================
        // 2. VERIFIKASI IDENTITAS — JANGAN PERCAYA uid DARI BODY!
        //    uid HANYA boleh diambil dari ID Token yang sudah
        //    diverifikasi Firebase Admin SDK.
        // ==========================================================
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

        if (!idToken) {
            return res.status(401).json({ success: false, message: 'Token otentikasi tidak ditemukan!' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa!' });
        }

        const uid = decodedToken.uid; // <-- uid TERPERCAYA, bukan dari req.body lagi

        // ==========================================================
        // 3. VALIDASI INPUT LAIN
        // ==========================================================
        const { correct, dbName } = req.body;

        if (typeof correct !== 'number' || correct < 0 || !Number.isFinite(correct)) {
            return res.status(400).json({ success: false, message: 'Data "correct" tidak valid!' });
        }
        if (typeof dbName !== 'string' || !(dbName in LEVEL_MULTIPLIERS)) {
            return res.status(400).json({ success: false, message: 'Level kuis tidak dikenali!' });
        }

        const db = admin.database();

        // ==========================================================
        // 4. RATE LIMIT — CEGAH SPAM SUBMIT BERULANG-ULANG
        //    Tolak request kalau user baru saja submit skor
        //    dalam interval MIN_SUBMIT_INTERVAL_MS terakhir.
        // ==========================================================
        const lastPlayedRef = db.ref(`users/${uid}/last_played`);
        const lastPlayedSnap = await lastPlayedRef.get();
        const lastPlayed = lastPlayedSnap.exists() ? lastPlayedSnap.val() : 0;
        const now = Date.now();

        if (now - lastPlayed < MIN_SUBMIT_INTERVAL_MS) {
            return res.status(429).json({
                success: false,
                message: 'Terlalu cepat! Tunggu sebentar sebelum submit skor lagi.'
            });
        }

        // ==========================================================
        // 5. HITUNG POIN DI SERVER (client tidak bisa manipulasi ini)
        // ==========================================================
        const multiplier = LEVEL_MULTIPLIERS[dbName] || 1;
        const poinDapat = Math.round(correct * multiplier);
        const skorAman = Math.min(poinDapat, 3); // Kunci batas maksimal +3 poin per penyelesaian kuis

        if (skorAman <= 0) {
            return res.status(200).json({ success: true, addedScore: 0, message: 'Tidak ada poin didapat.' });
        }

        // ==========================================================
        // 6. UPDATE total_score & last_played SECARA ATOMIK
        //    (last_played diupdate DI DALAM transaksi yang sama
        //    supaya tidak ada celah race-condition antara
        //    pengecekan rate limit dan penulisan skor)
        // ==========================================================
        const userRef = db.ref(`users/${uid}`);

        await userRef.transaction((currentData) => {
            if (currentData === null) currentData = {};

            // Double-check rate limit di dalam transaksi (mencegah race condition
            // kalau ada 2 request submit yang datang nyaris bersamaan)
            const currentLastPlayed = currentData.last_played || 0;
            if (now - currentLastPlayed < MIN_SUBMIT_INTERVAL_MS) {
                return; // batalkan transaksi, tidak ada perubahan
            }

            currentData.total_score = (currentData.total_score || 0) + skorAman;
            currentData.last_played = now;
            return currentData;
        });

        return res.status(200).json({
            success: true,
            addedScore: skorAman,
            message: `Berhasil menambahkan +${skorAman} poin ke database!`
        });

    } catch (error) {
        console.error('submit-score error:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
}
