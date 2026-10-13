export const config = {
    runtime: 'edge',
};

// Batas wajar agar kuota API key tidak dikuras satu request raksasa.
const MAX_PROMPT_CHARS = 2000;
// Rate limit sederhana per-IP (best-effort, per instance edge).
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const ipHits = new Map();

function isRateLimited(ip) {
    const now = Date.now();
    const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    hits.push(now);
    ipHits.set(ip, hits);
    // Bersihkan entri basi sesekali agar memori tidak membengkak.
    if (ipHits.size > 5000) {
        for (const [k, v] of ipHits) {
            if (v.length === 0 || now - v[v.length - 1] >= RATE_LIMIT_WINDOW_MS) ipHits.delete(k);
        }
    }
    return hits.length > RATE_LIMIT_MAX;
}

export default async function handler(req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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

        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            return new Response(JSON.stringify({ error: 'Prompt tidak boleh kosong.' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (prompt.length > MAX_PROMPT_CHARS) {
            return new Response(JSON.stringify({ error: `Prompt terlalu panjang (maks ${MAX_PROMPT_CHARS} karakter).` }), {
                status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        if (isRateLimited(ip)) {
            return new Response(JSON.stringify({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' }), {
                status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
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
                            maxOutputTokens: 4000,
                            topP: 0.95,
                        },
                        // Safety dikembalikan ke bawaan Google (blokir konten
                        // berbahaya). Jangan BLOCK_NONE di proxy terbuka.
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
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
