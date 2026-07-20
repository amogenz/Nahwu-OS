import admin from 'firebase-admin';

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
        const { uid, authorName, title, category, questions } = req.body;

        if (!uid || !authorName) {
            return res.status(401).json({ success: false, message: 'Kamu wajib login Google terlebih dahulu!' });
        }

        const safeTitle = cleanInput(title);
        const safeAuthor = cleanInput(authorName);
        const safeCategory = cleanInput(category);

        if (!safeTitle || safeTitle.length < 5) {
            return res.status(400).json({ success: false, message: 'Judul kuis minimal 5 karakter!' });
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Kuis minimal harus memiliki 1 soal!' });
        }

        if (questions.length > 14) {
            return res.status(400).json({ success: false, message: 'Maksimal 14 soal per kuis!' });
        }

        // Validasi & Sterilkan Setiap Soal (1 s/d 14 Soal)
        const sanitizedQuestions = [];
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const safeSentence = cleanInput(q.sentence || '');
            const safeWord = cleanInput(q.word || '');
            const safeQuestionText = cleanInput(q.question || '');
            const safeExplanation = cleanInput(q.explanation || '');

            const rawOptions = q.options || [];
            const safeOptions = rawOptions.map(opt => cleanInput(opt)).filter(opt => opt !== '');

            if (!safeSentence || !safeQuestionText || safeOptions.length < 2) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Soal #${i + 1} belum lengkap! Mohon isi kalimat, pertanyaan, dan minimal 2 pilihan jawaban.` 
                });
            }

            const correctIndex = parseInt(q.correctIndex) || 0;
            const safeCorrectText = safeOptions[correctIndex] || safeOptions[0];

            sanitizedQuestions.push({
                context: safeSentence,
                word: safeWord,
                question: safeQuestionText,
                options: safeOptions,
                correct: safeCorrectText,
                explanation: safeExplanation
            });
        }

        // Simpan ke Realtime Database
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
            questions: sanitizedQuestions
        };

        const db = admin.database();
        await db.ref(`community_quizzes/${quizId}`).set(dbData);

        return res.status(200).json({
            success: true,
            message: `Berhasil menerbitkan kuis dengan ${sanitizedQuestions.length} soal!`,
            quizId: quizId
        });

    } catch (error) {
        console.error("Gagal buat kuis:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
