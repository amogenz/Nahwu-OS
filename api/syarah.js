export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type',
        'Access-Control-Allow-Credentials': 'true',
    };

    // Respon cepat untuk OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Hanya menerima POST' }), { 
                status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const body = await req.json();
        const { prompt } = body;
        
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
            return new Response(JSON.stringify({ error: 'API Key belum di-setting.' }), { 
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        // Gunakan v1beta agar lebih stabil untuk stream
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${selectedKey}`;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { 
        temperature: 0.5, // Sedikit dinaikkan agar lebih luwes
        maxOutputTokens: 8000, // Gass ke 8000 bray, jangan takut
        topP: 0.95,
    },
    // Tambahkan ini agar AI tidak ragu-ragu mengeluarkan teks panjang
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
})

        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return new Response(JSON.stringify({ error: errorData.error?.message || 'Gemini Error' }), { 
                status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // BAGIAN KRITIS: Pastikan response.body ada
        if (!response.body) {
            throw new Error("No response body from Gemini");
        }

        return new Response(response.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Fetch Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Gagal menghubungi server AI.' }), { 
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
