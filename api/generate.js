import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// DATA INTERNAL (DAWUH & TOPIK)
// ==========================================
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

const TOPIK_KALIMAT = [
    "Tentang kesabaran", "Tentang pergi ke masjid", "Tentang membaca buku", 
    "Tentang keindahan alam", "Tentang menghormati guru", "Tentang sedekah",
    "Tentang sholat berjamaah", "Tentang pasar", "Tentang kebersihan",
    "Tentang persahabatan", "Tentang menuntut ilmu"
];

export default async function handler(req, res) {
  // 1. SETUP CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    // ============================================================
    // 2. LOGIC ROTASI API KEY (ANTI LIMIT + FALLBACK)
    // ============================================================
    
    // Cek semua kemungkinan nama variabel Key
    const potentialKeys = [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY // Cadangan jika user lupa isi yang angka
    ];

    // Filter hanya key yang ada isinya (Valid)
    const activeKeys = potentialKeys.filter(key => key && key.trim().length > 10);

    if (activeKeys.length === 0) {
        console.error("CRITICAL: Tidak ada API Key yang ditemukan di Environment Variables Vercel.");
        throw new Error("Server Misconfiguration: API Key Missing.");
    }

    // Pilih 1 Key secara Acak
    const selectedKey = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    
    // Inisialisasi Google AI
    const genAI = new GoogleGenerativeAI(selectedKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ============================================================
    // 3. LOGIC GENERATE SOAL
    // ============================================================
    const randomTopik = TOPIK_KALIMAT[Math.floor(Math.random() * TOPIK_KALIMAT.length)];

    const SYSTEM_PROMPT = `
    Role: Ammo (Ustadz Ahli Nahwu Senior dari Amogenz).
    Rujukan Wajib: Kitab Matan Al-Ajurrumiyyah & Nazhom Imrithi.
    
    TUGAS UTAMA:
    1. Buatlah SATU kalimat Arab pendek (3-5 kata) dengan topik: "${randomTopik}".
    2. Analisa kalimat tersebut per kata (Lafadz).
    3. Buat 8 pertanyaan berurutan yang SANGAT PRESISI secara kaidah Nahwu.

    ATURAN LOGIKA & SOAL (WAJIB DIPATUHI):
    
    A. PENCEGAHAN ERROR UMUM:
    - JANGAN PERNAH membuat pertanyaan singkat seperti "Alasannya?". Pertanyaan HARUS LENGKAP.
    - JANGAN gunakan kata "tersebut".
    
    B. LOGIKA LANGKAH 1 & 2 (IDENTIFIKASI):
    - Step 1: Jenis Kalimat (Isim/Fi'il/Huruf).
    - Step 2: Alasan Jenis (Harus tanda fisik atau makna, BUKAN 'Isim Mufrad').
    
    C. LOGIKA LANGKAH 3 s/d 8 (CABANG MU'ROB vs MABNI):
    - Step 3: Tentukan status: "Mu'rob" atau "Mabni".
    - Step 4: Alasan Mu'rob/Mabni.
    
    JIKA MU'ROB:
    - Step 5: Apa I'rob-nya? (Rafa/Nashob/Jar/Jazm).
    - Step 6: Kenapa I'rob-nya begitu? (Amil/Kedudukan).
    - Step 7: Apa Tanda I'rob-nya?
    - Step 8: Kenapa tandanya itu?
    
    JIKA MABNI:
    - Step 5: Mabni 'ala apa?
    - Step 6: Kenapa Mabni 'ala itu?
    - Step 7: Menempati Mahal apa? (Fi Mahalli...).
    - Step 8: Kenapa menempati Mahal itu?

    OUTPUT JSON MURNI:
    {
        "sentence": "Kalimat Arab Lengkap",
        "analysis": [
            {
                "word": "Kata 1",
                "quote": "Biarkan kosong", 
                "steps": {
                    "1": { "question": "...", "options": ["Isim","Fi'il","Huruf"], "correct": "Isim", "explanation": "..." },
                    "2": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "3": { "question": "...", "options": ["Mu'rob","Mabni"], "correct": "...", "explanation": "..." },
                    "4": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "5": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "6": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "7": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "8": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." }
                }
            }
        ]
    }
    `;

    const result = await model.generateContent(SYSTEM_PROMPT);
    const response = await result.response;
    
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let jsonData;
    try {
        jsonData = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("AI memberikan format yang salah. Coba lagi.");
    }

    // Overwrite Quote dengan Database Lokal
    if (jsonData.analysis && Array.isArray(jsonData.analysis)) {
        jsonData.analysis.forEach((item) => {
            const randomDawuh = DAWUH_SAYA[Math.floor(Math.random() * DAWUH_SAYA.length)];
            item.quote = randomDawuh;
        });
    }

    res.status(200).json({ result: JSON.stringify(jsonData) });

  } catch (error) {
    console.error("Backend Error:", error);
    // Kirim pesan error yang jelas ke Frontend
    res.status(500).json({ error: error.message || "Gagal terhubung ke AI." });
  }
}
