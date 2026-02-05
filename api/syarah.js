export default async function handler(req, res) {
    // 1. Tambahkan Header CORS agar App Android bisa akses
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Mengizinkan semua akses
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Tangani request preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima POST' });
    }

    const { prompt } = req.body;
    const keys = [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5,
        process.env.GEMINI_API_KEY_6,
        process.env.GEMINI_API_KEY
    ].filter(k => k);

    const selectedKey = keys[Math.floor(Math.random() * keys.length)];
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${selectedKey}`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 7017 }
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        res.status(200).json({ text: aiText });
    } catch (error) {
    console.error(error);
    // Jika Google kirim error 429 (Too Many Requests)
    if (error.status === 429) {
        return res.status(429).json({ error: 'Limit API Gemini habis, tunggu sebentar.' });
    }
    res.status(500).json({ error: 'Gagal memproses data dari AI.' });
}
}
