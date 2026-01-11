import { GoogleGenerativeAI } from "@google/generative-ai";

// Ambil API Key dari Environment Variable Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Setup CORS agar frontend bisa akses
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

    // SYSTEM PROMPT KITA PINDAH KESINI (LEBIH AMAN)
    const SYSTEM_PROMPT = `
    Role: Ammo (AI Guru Nahwu dari Amogenz.Inc).
    Rujukan: Jurumiyah & Imrithi.
    Tugas: 
    1. Buat SATU kalimat Arab pendek (3-5 kata) untuk latihan I'rob pemula.
    2. Analisa kalimat tersebut per kata.
    3. Buat 6 pertanyaan logika per kata:
       - Jenis (Isim/Fi'il/Huruf)
       - Alasan Jenis
       - I'rob (Rafa/Nashob/Jer/Jazm)
       - Alasan I'rob
       - Tanda I'rob
       - Alasan Tanda
    
    OUTPUT JSON MURNI:
    {
        "sentence": "Kalimat Arab",
        "analysis": [
            {
                "word": "Kata 1",
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
    Gunakan Bahasa Indonesia yang santai tapi edukatif.
    `;

    // Generate Content
    const result = await model.generateContent(SYSTEM_PROMPT + "\n\nBuat soal baru sekarang.");
    const response = await result.response;
    const text = response.text();

    // Kirim balik ke frontend
    res.status(200).json({ result: text });

  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  }
}
