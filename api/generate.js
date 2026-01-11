import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 1. DATABASE KALIMAT WAJIB (27 LAFADZ)
// ==========================================
const BANK_SOAL = [
    "الْقَمَرُ جَمِيْلٌ",
    "ذَهَبَ زَيْدٌ إِلَى الْمَسْجِدِ",
    "يَشْرَحُ الْأُسْتَاذُ الدَّرْسَ",
    "الْبَيْتُ وَاسِعٌ وَنَظِيْفٌ",
    "قَرَأَ الطَّالِبُ الْقُرْآنَ",
    "الْكِتَابُ عَلَى الْمَكْتَبِ",
    "صَلَّى الْمُسْلِمُوْنَ فِي الْمَسْجِدِ",
    "بَابُ الْمَدْرَسَةِ مَفْتُوْحٌ",
    "إِنَّ اللهَ غَفُوْرٌ رَحِيْمٌ",
    "كَانَ الْجَوُّ بَارِدًا",
    "لَمْ يَحْضُرْ خَالِدٌ الْيَوْمَ",
    "أُحِبُّ اللُّغَةَ الْعَرَبِيَّةَ",
    "هَذَا قَلَمٌ جَدِيْدٌ",
    "الطَّالِبَانِ مُجْتَهِدَانِ",
    "يَزْرَعُ الْفَلَّاحُ الرُّزَّ",
    "لَنْ يَنْجَحَ الْكَسْلَانُ",
    "اِفْتَحْ بَابَ الْفَصْلِ",
    "الْمُعَلِّمُوْنَ مُخْلِصُوْنَ",
    "أَبِيْ يَقْرَأُ الْجَرِيْدَةَ",
    "تَطْبُخُ الْأُمُّ الطَّعَامَ",
    "جَلَسَ الرَّجُلُ أَمَامَ الْبَيْتِ",
    "لَا تَلْعَبْ فِي الشَّارِعِ",
    "رَجَعَ الْمُسَافِرُ إِلَى بَلَدِهِ",
    "السَّيَّارَةُ لَوْنُهَا أَحْمَرُ",
    "أَكَلْتُ الْخُبْزَ وَالْلَحْمَ",
    "سَافَرَ زَيْدٌ صَبَاحًا",
    "الْعِلْمُ نُوْرٌ"
];

// Data Dawuh (Quote)
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
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // 1. Ambil Data 'seen' (Daftar ID soal yang sudah dikerjakan user)
    // Data dikirim dari frontend via POST body
    let seenIndices = [];
    if (req.body && req.body.seen) {
        seenIndices = req.body.seen;
    }

    // 2. Filter Kalimat yang Belum Dilihat
    // Kita buat array index [0, 1, 2, ... 26]
    const allIndices = BANK_SOAL.map((_, index) => index);
    const availableIndices = allIndices.filter(index => !seenIndices.includes(index));

    // 3. Tentukan Mode: Pakai Bank Soal atau Generate Baru?
    let targetSentence = "";
    let questionId = null; // ID soal (angka) atau 'ai_generated'

    if (availableIndices.length > 0) {
        // MODE A: STOK MASIH ADA -> PILIH ACAK DARI SISA
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        targetSentence = BANK_SOAL[randomIndex];
        questionId = randomIndex;
        console.log(`Mode Bank Soal: Index ${randomIndex} - ${targetSentence}`);
    } else {
        // MODE B: STOK HABIS -> AI GENERATE BARU
        // Topik acak untuk AI
        const topik = ["Tentang kesabaran", "Tentang masjid", "Tentang buku", "Tentang guru", "Tentang sedekah", "Tentang sholat", "Tentang pasar", "Tentang ilmu"];
        const randomTopik = topik[Math.floor(Math.random() * topik.length)];
        targetSentence = `Buatlah SATU kalimat Arab pendek (jumlah mufidah) dengan topik: "${randomTopik}".`;
        questionId = "ai_generated";
        console.log("Mode AI: Generate Baru");
    }

    // 4. Panggil AI untuk MENGANALISA Kalimat Terpilih
    const potentialKeys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY];
    const activeKeys = potentialKeys.filter(key => key && key.trim().length > 10);
    if (activeKeys.length === 0) throw new Error("API Key Missing.");
    
    const selectedKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    const genAI = new GoogleGenerativeAI(selectedKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" } 
    });

    // Prompt disesuaikan: Jika Mode A, kita SUPLAI kalimatnya. Jika Mode B, kita MINTA kalimatnya.
    let instruction = "";
    if (questionId !== "ai_generated") {
        instruction = `Analisa kalimat berikut ini: "${targetSentence}".`;
    } else {
        instruction = targetSentence; // Isinya perintah "Buatlah kalimat..."
    }

    const SYSTEM_PROMPT = `
    Role: Ammo (Ustadz Ahli Nahwu).
    TUGAS: ${instruction}
    
    Lakukan Analisa I'rob Lengkap per kata.
    Buat 8 pertanyaan presisi sesuai kaidah Jurumiyah/Imrithi.

    ATURAN:
    - Step 1-2: Jenis Kalimat (Isim/Fi'il/Huruf) & Tanda (Jangan jawab 'Isim Mufrad' disini).
    - Step 3-4: Mu'rob/Mabni & Alasannya.
    - Step 5-8: I'rob/Mahal & Tandanya.
    - Field 'correct' HARUS SAMA PERSIS dengan opsi.

    OUTPUT JSON:
    {
        "sentence": "${questionId !== 'ai_generated' ? targetSentence : 'Kalimat Arab Baru'}", 
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
    
    // Clean JSON text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);

    let jsonData = JSON.parse(text);

    // Pastikan ID tersimpan di JSON agar Frontend bisa mencatatnya
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
