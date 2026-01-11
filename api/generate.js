import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DAWUH_SAYA = [
    "Pelajarilah bahasa Arab, karena ia adalah bagian dari agamamu. (Umar bin Khattab)",
    "Barangsiapa mencari ilmu Nahwu, maka ia akan mendapat petunjuk ke segala ilmu.",
    "Kalam (ucapan) menurut ahli nahwu adalah lafazh yang tersusun yang memberi faedah dengan disengaja. (Jurumiyah)",
    "Kesalahan dalam Nahwu ibarat cacat di wajah yang rupawan.",
    "Awal ilmu adalah diam, kemudian mendengarkan, kemudian menghafal, kemudian mengamalkan, kemudian menyebarkan.",
    "Ilmu tanpa amal bagaikan pohon tanpa buah. Nahwu tanpa praktek bagaikan jasad tanpa ruh.",
    "Hiasilah lisanmu dengan Nahwu, niscaya engkau akan disegani dalam majelis ilmu.",
    "Jangan takut salah I'rob, karena dari kesalahan itulah kita memahami kaidah yang benar.",
    "Setiap Fa'il itu Rafa', setiap Maf'ul itu Nashob. Pahami kaidah ini sebagai pondasi.",
    "Tanda I'rob bukan sekedar harakat, tapi cerminan kedudukan kata dalam kalimat.",
    "Sebaik-baik teman duduk adalah kitab. Sebaik-baik bekal adalah Taqwa.",
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
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const randomTopik = TOPIK_KALIMAT[Math.floor(Math.random() * TOPIK_KALIMAT.length)];

    const SYSTEM_PROMPT = `
    Role: Ammo (AI Guru Nahwu dari Amogenz.Inc).
    Rujukan Wajib: Kitab Matan Al-Ajurrumiyyah & Nazhom Imrithi.
    
    TUGAS: 
    1. Buatlah SATU kalimat Arab pendek (3-6 kata) dengan topik: "${randomTopik}".
    2. Analisa kalimat tersebut per kata (Lafadz).
    3. Buat 6 level pertanyaan berurutan untuk setiap kata.
    
    ATURAN LOGIKA (PENTING):
    - Penjelasan MENGAPA (alasan) harus berdasarkan kaidah Jurumiyah/Imrithi.
      Contoh: "Kenapa Rafa? Karena menjadi Fa'il, dan Fa'il itu hukumnya Rafa menurut Jurumiyah."
    - JANGAN gunakan kata "tersebut" untuk menunjuk kata sebelumnya. Gunakan nama katanya langsung.
    
    ATURAN JSON (WAJIB):
    - Field 'correct' HARUS SAMA PERSIS (Copy-Paste) dengan salah satu string di dalam array 'options'. Jangan beda satu huruf pun.
    - Jangan ada spasi tambahan di awal/akhir string.
    
    OUTPUT JSON MURNI:
    {
        "sentence": "Kalimat Arab",
        "analysis": [
            {
                "word": "Kata 1",
                "quote": "Biarkan kosong", 
                "steps": {
                    "1": { "question": "...", "options": ["Isim","Fi'il","Huruf"], "correct": "Isim", "explanation": "..." },
                    "2": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "3": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "4": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "5": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." },
                    "6": { "question": "...", "options": ["...","..."], "correct": "...", "explanation": "..." }
                }
            }
        ]
    }
    `;

    const result = await model.generateContent(SYSTEM_PROMPT);
    const response = await result.response;
    
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let jsonData = JSON.parse(text);

    // Overwrite Quote dengan Database Lokal
    if (jsonData.analysis && Array.isArray(jsonData.analysis)) {
        jsonData.analysis.forEach((item) => {
            const randomDawuh = DAWUH_SAYA[Math.floor(Math.random() * DAWUH_SAYA.length)];
            item.quote = randomDawuh;
        });
    }

    res.status(200).json({ result: JSON.stringify(jsonData) });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}
