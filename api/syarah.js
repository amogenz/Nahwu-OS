export default async function handler(req, res) {
    // 1. Header CORS - Agar bisa diakses dari .xyz, .my.id, dan App Android
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima POST' });
    }

    const { prompt } = req.body;
    
    // Ambil semua key dari environment variables
    const keys = [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5,
        process.env.GEMINI_API_KEY_6,
        process.env.GEMINI_API_KEY
    ].filter(k => k);

    if (keys.length === 0) {
        return res.status(500).json({ error: 'API Key belum di-setting di Vercel.' });
    }

    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    
    // PERBAIKAN: Gunakan model 1.5-flash atau 2.0-flash
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${selectedKey}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.7, 
                    maxOutputTokens: 7000 // Sudah sangat cukup untuk detail Nahwu
                }
            })
        });

        const data = await response.json();

        // Cek jika ada error dari sisi Google Gemini
        if (!response.ok || data.error) {
            if (response.status === 429 || (data.error && data.error.code === 429)) {
                return res.status(429).json({ error: 'Limit API Gemini habis, mohon tunggu sebentar ya.' });
            }
            return res.status(response.status || 500).json({ error: data.error?.message || 'Terjadi kesalahan pada layanan AI.' });
        }

        // Pastikan struktur data ada sebelum mengaksesnya
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const aiText = data.candidates[0].content.parts[0].text;
            res.status(200).json({ text: aiText });
        } else {
            throw new Error('Format respon AI tidak sesuai.');
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: 'Gagal menghubungi server AI. Coba lagi nanti.' });
    }
}
