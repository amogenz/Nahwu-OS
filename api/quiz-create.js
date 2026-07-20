import admin from 'firebase-admin';

// Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

// 🛡️ FUNGSI PEMBERSIH TEKS (ANTI SCRIPT INJECTION / XSS)
function cleanInput(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .trim();
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { uid, authorName, title, category, questionData } = req.body;

        // 1. Validasi Login
        if (!uid || !authorName) {
            return res.status(401).json({ success: false, message: 'Kamu wajib login Google terlebih dahulu!' });
        }

        // 2. Sterilkan Input Utama
        const safeTitle = cleanInput(title);
        const safeAuthor = cleanInput(authorName);
        const safeCategory = cleanInput(category);

        if (!safeTitle || safeTitle.length < 5) {
            return res.status(400).json({ success: false, message: 'Judul kuis minimal 5 karakter!' });
        }

        // 3. Validasi & Sterilkan Isi Soal
        if (!questionData || !questionData.sentence || !questionData.question) {
            return res.status(400).json({ success: false, message: 'Data soal tidak lengkap!' });
        }

        const safeSentence = cleanInput(questionData.sentence);
        const safeWord = cleanInput(questionData.word);
        const safeQuestionText = cleanInput(questionData.question);
        const safeExplanation = cleanInput(questionData.explanation || '');

        // Sterilkan 4 pilihan jawaban
        const rawOptions = questionData.options || [];
        const safeOptions = rawOptions.map(opt => cleanInput(opt)).filter(opt => opt !== '');

        if (safeOptions.length < 2) {
            return res.status(400).json({ success: false, message: 'Minimal sediakan 2 pilihan jawaban!' });
        }

        const correctIndex = parseInt(questionData.correctIndex) || 0;
        const safeCorrectText = safeOptions[correctIndex] || safeOptions[0];

        // 4. Susun Format Data Rapi untuk Database
        const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const dbData = {
            id: quizId,
            title: safeTitle,
            category: safeCategory,
            author_uid: uid,
            author_name: safeAuthor,
            created_at: Date.now(),
            plays_count: 0,
            likes_count: 0,
            questions: [
                {
                    context: safeSentence,
                    word: safeWord,
                    question: safeQuestionText,
                    options: safeOptions,
                    correct: safeCorrectText,
                    explanation: safeExplanation
                }
            ]
        };

        // 5. Simpan ke Firebase via Admin SDK (Sangat Aman)
        const db = admin.database();
        await db.ref(`community_quizzes/${quizId}`).set(dbData);

        return res.status(200).json({
            success: true,
            message: 'Kuis berhasil diterbitkan ke Arena Komunitas!',
            quizId: quizId
        });

    } catch (error) {
        console.error("Gagal buat kuis:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
