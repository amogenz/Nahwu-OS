import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. BANK SOAL (27 LAFADZ)
const BANK_SOAL = [
    "الْقَمَرُ جَمِيْلٌ", "ذَهَبَ زَيْدٌ إِلَى الْمَسْجِدِ", "يَشْرَحُ الْأُسْتَاذُ الدَّرْسَ",
    "الْبَيْتُ وَاسِعٌ وَنَظِيْفٌ", "قَرَأَ الطَّالِبُ الْقُرْآنَ", "الْكِتَابُ عَلَى الْمَكْتَبِ",
    "صَلَّى الْمُسْلِمُوْنَ فِي الْمَسْجِدِ", "بَابُ الْمَدْرَسَةِ مَفْتُوْحٌ", "إِنَّ اللهَ غَفُوْرٌ رَحِيْمٌ",
    "كَانَ الْجَوُّ بَارِدًا", "لَمْ يَحْضُرْ خَالِدٌ الْيَوْمَ", "أُحِبُّ اللُّغَةَ الْعَرَبِيَّةَ",
    "هَذَا قَلَمٌ جَدِيْدٌ", "الطَّالِبَانِ مُجْتَهِدَانِ", "يَزْرَعُ الْفَلَّاحُ الرُّزَّ",
    "لَنْ يَنْجَحَ الْكَسْلَانُ", "اِفْتَحْ بَابَ الْفَصْلِ", "الْمُعَلِّمُوْنَ مُخْلِصُوْنَ",
    "أَبِيْ يَقْرَأُ الْجَرِيْدَةَ", "تَطْبُخُ الْأُمُّ الطَّعَامَ", "جَلَسَ الرَّجُلُ أَمَامَ الْبَيْتِ",
    "لَا تَلْعَبْ فِي الشَّارِعِ", "رَجَعَ الْمُسَافِرُ إِلَى بَلَدِهِ", "السَّيَّارَةُ لَوْنُهَا أَحْمَرُ",
    "أَكَلْتُ الْخُبْزَ وَالْلَحْمَ", "سَافَرَ زَيْدٌ صَبَاحًا", "الْعِلْمُ نُوْرٌ"
];

// (BAGIAN DAWUH SUDAH DIHAPUS TOTAL DARI SINI)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // LOGIC ROTASI API KEY
    const potentialKeys = [
        process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, 
        process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY
    ];
    const activeKeys = potentialKeys.filter(key => key && key.trim().length > 10);
    if (activeKeys.length === 0) throw new Error("API Key Missing.");
    
    const selectedKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    const genAI = new GoogleGenerativeAI(selectedKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // LOGIC BANK SOAL
    let seenIndices = [];
    if (req.body && req.body.seen) seenIndices = req.body.seen;
    const allIndices = BANK_SOAL.map((_, index) => index);
    const availableIndices = allIndices.filter(index => !seenIndices.includes(index));

    let targetSentence = "";
    let questionId = null;

    if (availableIndices.length > 0) {
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        targetSentence = BANK_SOAL[randomIndex];
        questionId = randomIndex;
    } else {
        const topik = ["Tentang masjid", "Tentang buku", "Tentang guru", "Tentang sedekah", "Tentang sholat", "Tentang pasar", "Tentang ilmu"];
        const randomTopik = topik[Math.floor(Math.random() * topik.length)];
        targetSentence = `Buatlah SATU kalimat Arab pendek (jumlah mufidah) dengan topik: "${randomTopik}".`;
        questionId = "ai_generated";
    }

    let instruction = (questionId !== "ai_generated") ? `Analisa kalimat berikut: "${targetSentence}".` : targetSentence;

    const SYSTEM_PROMPT = `
    Role: Ammo (Ustadz Ahli Nahwu).
    TUGAS: ${instruction}
    
    Lakukan Analisa I'rob Lengkap per kata. Buat 8 pertanyaan presisi.

    ATURAN LANGKAH (WAJIB):
    1. Jenis Kalimat (Isim/Fi'il/Huruf).
    2. Alasan Jenis (Tanda fisik/makna). JANGAN jawab 'Isim Mufrad' disini.
    3. Status (Mu'rob/Mabni).
    4. Alasan Status (Misal: Karena Isim Mufrad (Mu'rob) atau Fi'il Madhi (Mabni)).
    5. I'rob / Mabni 'ala.
    6. Alasan I'rob (Kedudukan/Amil, misal: Karena jadi Fa'il).
    7. Tanda I'rob / Mahal I'rob.
    8. ALASAN TANDA (PENTING): Jawablah berdasarkan BENTUK KATA.
       Contoh: "Kenapa tandanya Dhommah?" Jawab: "Karena Isim Mufrad" atau "Karena Jamak Taksir".

    FORMAT OUTPUT (JSON ONLY):
    {
        "sentence": "${questionId !== 'ai_generated' ? targetSentence : 'Kalimat Baru'}", 
        "id": "${questionId}",
        "analysis": [
            {
                "word": "Kata",
                "quote": "", 
                "steps": {
                    "1": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "2": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "3": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "4": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "5": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "6": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "7": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." },
                    "8": { "question": "...", "options": ["..."], "correct": "...", "explanation": "..." }
                }
            }
        ]
    }
    `;

    const result = await model.generateContent(SYSTEM_PROMPT);
    const response = await result.response;
    let text = response.text();
    
    // Cleaning
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);

    let jsonData = JSON.parse(text);
    jsonData.id = questionId;

    // (LOGIKA INJECT DAWUH SUDAH DIHAPUS - BERSIH)

    res.status(200).json({ result: JSON.stringify(jsonData) });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message });
  }
}
