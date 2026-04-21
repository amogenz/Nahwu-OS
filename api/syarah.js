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

        // --- FITUR GAHAR: SMART LOAD BALANCING & AUTO-RETRY ---
        // Acak urutan array key agar adil pembagian bebannya
        const shuffledKeys = keys.sort(() => 0.5 - Math.random());
        
        let response = null;
        let lastErrorMessage = '';

        // Coba satu per satu key yang ada sampai berhasil (Tembus)
        for (const key of shuffledKeys) {
            const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${key}`;

            try {
                const res = await fetch(GEMINI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { 
                            temperature: 0.7, 
                            maxOutputTokens: 8000, // Diubah! 2500 sudah sangat lega, bikin AI gak gampang limit
                            topP: 0.95,
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
                    })
                });

                if (res.ok) {
                    response = res; // Key berhasil menembus Google!
                    break; // Langsung hentikan loop pencarian key
                } else {
                    // Jika key gagal (biasanya status 429 Too Many Requests / Limit)
                    const errData = await res.json().catch(() => ({}));
                    lastErrorMessage = errData.error?.message || `Error status ${res.status}`;
                    console.warn(`Key limit/gagal, otomatis pindah ke key lain...`, lastErrorMessage);
                    // Kode akan lanjut memutar loop ke key berikutnya
                }
            } catch (e) {
                lastErrorMessage = e.message;
            }
        }

        // Jika ke-7 key sudah dicoba dan tidak ada satupun yang tembus
        if (!response || !response.ok || !response.body) {
            return new Response(JSON.stringify({ error: 'Server AI sedang sangat sibuk. Coba beberapa saat lagi. (' + lastErrorMessage + ')' }), { 
                status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
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
        console.error("Critical Server Error:", error);
        return new Response(JSON.stringify({ error: error.message || 'Gagal menghubungi server AI.' }), { 
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
