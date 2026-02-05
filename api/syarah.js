// 1. BAGIAN WAJIB: Gunakan Edge Runtime agar tidak kena limit 10 detik
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // 2. Header CORS untuk Edge Runtime (Menggunakan standar Web API Response)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Content-Type',
        'Access-Control-Allow-Credentials': 'true',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Hanya menerima POST' }), { 
            status: 405, 
            headers: corsHeaders 
        });
    }

    try {
        const { prompt } = await req.json();
        
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
            return new Response(JSON.stringify({ error: 'API Key belum di-setting.' }), { status: 500 });
        }

        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        
        // 3. UBAH URL: Gunakan streamGenerateContent dan alt=sse
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${selectedKey}`;

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.5,
                    maxOutputTokens: 4000 // Kapasitas lebih besar untuk analisis panjang
                }
            })
        });

        // Cek error awal
        if (!response.ok) {
            const errorData = await response.json();
            return new Response(JSON.stringify({ error: errorData.error?.message || 'Gemini Error' }), { 
                status: response.status,
                headers: corsHeaders 
            });
        }

        // 4. KIRIM RESPONSE SEBAGAI STREAM
        // Kita langsung meneruskan (pipe) body dari Gemini ke Client
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
        return new Response(JSON.stringify({ error: 'Gagal menghubungi server AI.' }), { 
            status: 500,
            headers: corsHeaders 
        });
    }
}
