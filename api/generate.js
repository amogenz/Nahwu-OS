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

// 2. DATA DAWUH
const DAWUH_SAYA = [
    "Pelajarilah bahasa Arab, karena ia adalah bagian dari agamamu. (Umar bin Khattab)",
    "Barangsiapa mencari ilmu Nahwu, maka ia akan mendapat petunjuk ke segala ilmu.",
    "Kalam (ucapan) menurut ahli nahwu adalah lafazh yang tersusun yang memberi faedah dengan disengaja.",
    "Kesalahan dalam Nahwu ibarat cacat di wajah yang rupawan.",
    "Awal ilmu adalah diam, kemudian mendengarkan, kemudian menghafal, kemudian mengamalkan, kemudian menyebarkan.",
    "Ilmu tanpa amal bagaikan pohon tanpa buah. Nahwu tanpa praktek bagaikan jasad tanpa ruh.",
    "Jangan takut salah I'rob, karena dari kesalahan itulah kita memahami kaidah yang benar.",
    "Setiap Fa'il itu Rafa', setiap Maf'ul itu Nashob. Pahami kaidah ini sebagai pondasi.",
    "Tanda I'rob bukan sekedar harakat, tapi cerminan kedudukan kata dalam kalimat.",
    "Man jadda wajada. Barangsiapa bersungguh-sungguh (belajar Nahwu), pasti dapat.",
    "Keutamaan Nahwu bagi lisan, seperti garam bagi masakan.",
    "Jadikan kitab Jurumiyah & Imrithi sebagai sahabat setiamu dalam memahami agama."
];

export default async function handler(req, res) {
  // SETUP CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // 3. LOGIC ROTASI API KEY (ANTI LIMIT)
    const potentialKeys = [
        process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, 
        process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY
    ];
    const activeKeys = potentialKeys.filter(key => key && key.trim().length > 10);
    
    if (activeKeys.length === 0) throw new Error("API Key Missing in Vercel.");
    
    const selectedKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    const genAI = new GoogleGenerativeAI(selectedKey);
    
    // --- PERBAIKAN: HAPUS CONFIG YANG BIKIN ERROR ---
    // Kita hapus generationConfig yang berisi responseMimeType
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. LOGIC PILIH KALIMAT
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

    // 5. PROMPT DENGAN INSTRUKSI RAW JSON (Strict)
    let instruction = (questionId !== "ai_generated") ? `Analisa kalimat berikut ini: "${targetSentence}".` : targetSentence;

    const SYSTEM_PROMPT = `
    Role: Ammo (Ustadz Ahli Nahwu).
    TUGAS: ${instruction}
    
    Lakukan Analisa I'rob Lengkap per kata.
    Buat 8 pertanyaan presisi sesuai kaidah Jurumiyah/Imrithi.

    ATURAN PENTING:
    1. Output HANYA boleh JSON. Jangan ada kata pembuka seperti "Assalamu'alaikum" atau "Baiklah".
    2. Step 1-2: Jenis Kalimat (Isim/Fi'il/Huruf) & Tanda.
    3. Step 3-4: Mu'rob/Mabni & Alasannya.
    4. Step 5-8: I'rob/Mahal & Tandanya.
    5. Field 'correct' HARUS SAMA PERSIS dengan opsi.

    OUTPUT FORMAT JSON:
    {
        "sentence": "${questionId !== 'ai_generated' ? targetSentence : 'Kalimat Baru'}", 
        "id": "${questionId}",
        "analysis": [
            {
                "word": "Kata 1",
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
    
    // --- MANUAL CLEANING (PEMBERSIH SUPER KUAT) ---
    // Ini solusi pengganti JSON Mode agar tidak error di server Vercel lama
    // Kita cari kurung kurawal pertama '{' dan terakhir '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    } else {
        throw new Error("AI tidak menghasilkan JSON yang valid.");
    }

    let jsonData;
    try {
        jsonData = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("Gagal membaca respon AI.");
    }

    // Pastikan ID tersimpan
    jsonData.id = questionId;

    // Inject Dawuh
    if (jsonData.analysis && Array.isArray(jsonData.analysis)) {
        jsonData.analysis.forEach((item) => {
            item.quote = DAWUH_SAYA[Math.floor(Math.random() * DAWUH_SAYA.length)];
        });
    }

    res.status(200).json({ result: JSON.stringify(jsonData) });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message });
  }
}
