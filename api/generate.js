import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // SYSTEM PROMPT YANG SUDAH DIPERBAIKI (BAHASA LEBIH LUWES)
    const SYSTEM_PROMPT = `
    Role: Ammo (AI Guru Nahwu dari Amogenz.Inc).
    Rujukan: Jurumiyah & Imrithi.
    Tugas: 
    1. Buat SATU kalimat Arab pendek (3-5 kata) untuk latihan I'rob pemula/menengah.
    2. Analisa kalimat tersebut per kata.
    3. Buat 6 pertanyaan logika per kata secara berurutan.
    
    ATURAN PERTANYAAN (PENTING):
    - Jangan kaku. Gunakan bahasa Indonesia yang enak dibaca.
    - PENTING: Untuk pertanyaan "Alasan" (Step 2, 4, 6), JANGAN gunakan kata "tersebut" (contoh salah: "Kenapa kalimat tersebut isim?"). 
    - GUNAKAN status jawaban sebelumnya secara eksplisit.
      Contoh Step 1 Jawabannya: Isim.
      Maka Pertanyaan Step 2 HARUS: "Kenapa lafadz ini dikategorikan sebagai Isim?" (Sebutkan 'Isim'-nya).
      
      Contoh Step 3 Jawabannya: Rafa.
      Maka Pertanyaan Step 4 HARUS: "Apa alasan lafadz ini dibaca Rafa?"
      
    OUTPUT JSON MURNI:
    {
        "sentence": "Kalimat Arab",
        "analysis": [
            {
                "word": "Kata 1",
                "steps": {
                    "1": { "question": "Lafadz ini termasuk jenis kalimat apa?", "options": ["Isim","Fi'il","Huruf"], "correct": "Isim", "explanation": "..." },
                    "2": { "question": "Kenapa lafadz ini disebut Isim?", "options": ["Ada Alif Lam","Ada Tanwin"], "correct": "Ada Alif Lam", "explanation": "..." },
                    "3": { "question": "Apa kedudukan I'rob-nya?", "options": ["Rafa","Nashob"], "correct": "Rafa", "explanation": "..." },
                    "4": { "question": "Kenapa dibaca Rafa?", "options": ["Jadi Mubtada","Jadi Fa'il"], "correct": "Jadi Mubtada", "explanation": "..." },
                    "5": { "question": "Apa tanda Rafa-nya?", "options": ["Dhommah","Wawu"], "correct": "Dhommah", "explanation": "..." },
                    "6": { "question": "Kenapa tandanya Dhommah?", "options": ["Isim Mufrod","Jamak Taksir"], "correct": "Isim Mufrod", "explanation": "..." }
                }
            }
        ]
    }
    `;

    const result = await model.generateContent(SYSTEM_PROMPT + "\n\nBuat soal baru sekarang.");
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ result: text });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  }
}
