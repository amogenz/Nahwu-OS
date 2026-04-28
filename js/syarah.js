// ============================================================
// js/syarah.js
// Fitur Syarah AI — analisis kalimat Arab
// ============================================================

import { db } from './firebase.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { isArabicText, countArabicWords, createCacheKey } from './utils.js';

// --- Tentukan API URL berdasarkan hostname ---
function getApiUrl() {
    const h = window.location.hostname;
    if (h.includes('amogenz.xyz'))   return 'https://nahwu.amogenz.xyz/api/syarah';
    if (h.includes('amogenz.my.id')) return 'https://nahwu.amogenz.my.id/api/syarah';
    return 'https://nahwu-os-git-playground-ammos-projects-0b62d4a2.vercel.app/api/syarah';
}

// --- Prompt builder ---
function buildPrompt(input) {
    return `Analisis kalimat Arab berikut per lafadz dengan sangat detail sesuai kaidah ilmu Nahwu dan Shorof:
Kalimat: ${input}

Berikan analisis mendalam untuk SETIAP kata dengan format persis seperti ini:

=== LAFADZ: [kata arab] ===
1. Jenis: [Isim/Fi'il/Huruf] 
2. Alasannya: [Penjelasan tanda-tanda yang ada pada kata tersebut] + dalil dari jurumiyah, imrithi, dan al fiyah (kalau memang ada)
3. Status: [Mu'rob/Mabni]
4. Alasan Status: [Kenapa mu'rob atau kenapa mabni] + dalil dari jurumiyah, imrithi, dan al fiyah (kalau memang ada)
5. I'robnya: [Rafa'/Nashab/Jarr/Jazm/Mabni]
6. Alasan I'rob: [Contoh: Karena menjadi Khobar, dll] + dalil dari jurumiyah, imrithi, dan al fiyah (kalau memang ada)
7. Tanda I'rob: [Contoh: Dhammah/Fathah/Ya'/Tsubutun Nun, dll]
8. Alasan Tanda: [Contoh: Isim Mufrad/Asmaul Khomsah/Af'alul Khomsah, dll] + dalil dari jurumiyah, imrithi, dan al fiyah (kalau memang ada)
9. Bina'nya: [Jika Mabni, sebutkan Mabni 'ala apa. Jika Fi'il sebutkan Bina' Shohih/Mu'tal dll]
10. Shighotnya: [Jenis kata secara Shorof: Madhi/Mudhari/Masdar/Isim Fa'il dll]
11. Tasrifnya: dari istilahy dan lughowinya [Penjelasan rinci asal kata, perubahan dari bentuk asal ke bentuk sekarang]

PENTING HARGA MATI !!! Berikan jawaban secara lengkap sampai tuntas hingga poin ke-11 untuk setiap kata. Jangan memotong penjelasan di tengah kalimat. PASTIKAN SELESAI DAN KOMPLIT

Gunakan Bahasa Indonesia yang mudah dipahami santri. Pisahkan antar kata dengan pembatas ===.`;
}

// --- Display hasil AI ke DOM ---
export function displaySyarahResult(result) {
    const resultDiv       = document.getElementById('syarah-content');
    const resultContainer = document.getElementById('syarah-result');

    let cleanText = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const formattedHtml = cleanText.split('\n').map(line => {
        const t = line.trim();
        if (!t) return '<div class="spacer" style="height:10px"></div>';
        if (t.startsWith('===')) {
            const label = t.replace(/=/g, '').replace('LAFADZ:', '').trim();
            return `<div class="lafadz-header">📝 LAFADZ: ${label}</div>`;
        }
        if (/^\d+\./.test(t)) return `<div class="analysis-point">${t}</div>`;
        return `<div class="normal-line">${t}</div>`;
    }).join('');

    requestAnimationFrame(() => {
        resultDiv.innerHTML = formattedHtml;
        if (resultContainer.style.display !== 'block') resultContainer.style.display = 'block';
        const nearBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 150;
        if (nearBottom) window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
}

// --- Copy result ---
export function copySyarahResult() {
    const content = document.getElementById('syarah-content').innerText;
    navigator.clipboard.writeText(content).then(() => {
        const btn = document.getElementById('btn-copy-syarah');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-check"></i> Tersalin!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
    });
}

// --- Main analyze function ---
export async function analyzeSyarah() {
    const input       = document.getElementById('arabic-input').value.trim();
    const resultArea  = document.getElementById('syarah-result');
    const loadingArea = document.getElementById('syarah-loading');
    const resultDiv   = document.getElementById('syarah-content');

    // Validasi
    if (!input)                          { alert('Mohon masukkan lafadz Arab terlebih dahulu!'); return; }
    if (!isArabicText(input))            { alert('Hanya kalimat Arab yang diperbolehkan!'); return; }
    const wordCount = countArabicWords(input);
    if (wordCount > 7)                   { alert(`Kalimat terlalu panjang! (${wordCount} kata). Maksimal 7 kata.`); return; }
    if (!navigator.onLine)               { alert('Sepertinya kamu sedang offline. Fitur Syarah AI memerlukan internet.'); return; }

    resultArea.style.display  = 'none';
    loadingArea.style.display = 'flex';

    // Cek cache Firebase
    const cacheKey = createCacheKey(input);
    const cacheRef = ref(db, `syarah_cache/${cacheKey}`);

    try {
        const snapshot = await get(cacheRef);
        if (snapshot.exists()) {
            loadingArea.style.display = 'none';
            resultArea.style.display  = 'block';
            displaySyarahResult(snapshot.val().result);
            console.log('⚡ [CACHE HIT] Diambil dari Firebase!');
            return;
        }
    } catch (e) {
        console.warn('Gagal cek cache Firebase, lanjut ke AI:', e);
    }

    // Panggil AI API (streaming)
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: buildPrompt(input) })
        });

        if (!response.ok) throw new Error('Gagal menghubungi AI.');

        const reader   = response.body.getReader();
        const decoder  = new TextDecoder();
        let cumulative = '';
        let buffer     = '';
        let hasStarted = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(trimmed.replace('data: ', '').trim());
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        if (!hasStarted) {
                            hasStarted = true;
                            loadingArea.style.display = 'none';
                            resultArea.style.display  = 'block';
                            resultDiv.innerHTML        = '';
                        }
                        cumulative += data.candidates[0].content.parts[0].text;
                        displaySyarahResult(cumulative);
                    }
                } catch (e) {
                    buffer = line + '\n' + buffer;
                }
            }
        }

        if (!hasStarted) throw new Error('AI tidak memberikan respon. Coba ulangi.');

        // Simpan ke cache Firebase
        if (cumulative.length > 50) {
            try {
                await set(cacheRef, { original_input: input, result: cumulative, created_at: Date.now() });
                console.log('✅ [CACHE SAVED] Lafadz baru berhasil disimpan ke database.');
            } catch (e) {
                console.warn('Gagal menyimpan ke cache Firebase:', e);
            }
        }

    } catch (err) {
        console.error('Syarah Error:', err);
        alert('Maaf, kendala: ' + err.message);
    } finally {
        loadingArea.style.display = 'none';
    }
}

// --- Init event listeners untuk halaman Syarah ---
export function initSyarah() {
    const arabicInput = document.getElementById('arabic-input');
    const charCount   = document.getElementById('char-count');
    const btnSyarah   = document.getElementById('btn-syarah');

    arabicInput.addEventListener('input', (e) => {
        const text      = e.target.value;
        const wordCount = countArabicWords(text);
        charCount.textContent = text.length;
        btnSyarah.disabled    = !(isArabicText(text) && wordCount > 0 && wordCount <= 7);
        if (text.length >= 21) e.target.value = text.substring(0, 21);
    });

    btnSyarah.addEventListener('click', analyzeSyarah);
    document.getElementById('btn-copy-syarah').addEventListener('click', copySyarahResult);
}
