import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==============================================================================
// DAFTAR DAWUH ULAMA & MOTIVASI (EDIT BAGIAN INI UNTUK MENAMBAH KATA-KATA BARU)
// ==============================================================================
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
    "Orang yang paham Nahwu, akan merasakan keindahan Al-Qur'an yang sesungguhnya.",
    "Belajar Nahwu itu sulit di awal, tapi nikmat di akhir.",
    "Jadikan kitab Jurumiyah & Imrithi sebagai sahabat setiamu dalam memahami agama."
];

export default async function handler(req, res) {
  // 1. SETUP CORS (Agar Frontend bisa mengakses Backend ini)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 2. SYSTEM PROMPT (INSTRUKSI UTAMA KE AI)
    const SYSTEM_PROMPT = `
    Role: Ammo (AI Guru Nahwu dari Amogenz.Inc).
    Rujukan Utama: Kitab Al-Ajurrumiyyah & Nazhom Imrithi.
    
    TUGAS: 
    1. Buatlah SATU kalimat Arab pendek (3-5 kata) yang cocok untuk latihan pemula/menengah.
    2. Analisa kalimat tersebut per kata (Lafadz).
    3. Buat 6 level pertanyaan berurutan untuk setiap kata.
    
    ATURAN PERTANYAAN (WAJIB DIPATUHI):
    - Gunakan Bahasa Indonesia yang luwes, santai, tapi tetap sopan & edukatif.
    - PENTING: JANGAN gunakan kata "tersebut" untuk menunjuk kata sebelumnya. Gunakan nama kategorinya langsung.
    
    CONTOH POLA PERTANYAAN YANG BENAR:
    - Step 1: "Lafadz ini termasuk jenis kalimat apa?" (Jawab: Isim)
    - Step 2: "Kenapa lafadz ini disebut Isim?" (JANGAN tanya: Kenapa kalimat tersebut isim?)
    - Step 3: "Apa kedudukan I'rob-nya?" (Jawab: Rafa)
    - Step 4: "Kenapa dibaca Rafa?" (Sebutkan alasannya, misal: Karena jadi Fa'il)
    - Step 5: "Apa tanda Rafa-nya?" (Jawab: Dhommah)
    - Step 6: "Kenapa tandanya Dhommah?" (Jawab: Karena Isim Mufrod)

    OUTPUT JSON MURNI (TANPA MARKDOWN):
    {
        "sentence": "Kalimat Arab berharakat lengkap",
        "analysis": [
            {
                "word": "Kata Arab",
                "quote": "Biarkan kosong, nanti diisi server", 
                "steps": {
                    "1": { "question": "...", "options": ["A","B","C"], "correct": "A", "explanation": "..." },
                    "2": { "question": "...", "options": ["A","B"], "correct": "A", "explanation": "..." },
                    "3": { "question": "...", "options": ["A","B"], "correct": "A", "explanation": "..." },
                    "4": { "question": "...", "options": ["A","B"], "correct": "A", "explanation": "..." },
                    "5": { "question": "...", "options": ["A","B"], "correct": "A", "explanation": "..." },
                    "6": { "question": "...", "options": ["A","B"], "correct": "A", "explanation": "..." }
                }
            }
        ]
    }
    `;

    // 3. MINTA DATA KE GEMINI
    const result = await model.generateContent(SYSTEM_PROMPT + "\n\nBuat soal baru sekarang.");
    const response = await result.response;
    
    // 4. BERSIHKAN HASIL (Hapus markdown ```json jika ada)
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 5. PARSE KE OBJECT JAVASCRIPT
    let jsonData = JSON.parse(text);

    // 6. TIMPA (OVERWRITE) QUOTE DENGAN DAWUH

    if (jsonData.analysis && Array.isArray(jsonData.analysis)) {
        jsonData.analysis.forEach((item) => {
            const randomDawuh = DAWUH_SAYA[Math.floor(Math.random() * DAWUH_SAYA.length)];
            item.quote = randomDawuh;
        });
    }

    // 7. KIRIM KE FRONTEND
    res.status(200).json({ result: JSON.stringify(jsonData) });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  }
}
