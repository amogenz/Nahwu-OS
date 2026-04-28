// ============================================================
// js/utils.js
// Fungsi helper umum yang dipakai di banyak modul
// ============================================================

import { els } from './state.js';

// --- Audio ---
const sndCorrect = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
const sndWrong   = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
sndCorrect.load();
sndWrong.load();

export function playSound(isCorrect) {
    if (!els.soundToggle || !els.soundToggle.checked) return;
    if (isCorrect) {
        sndCorrect.currentTime = 0;
        sndCorrect.play().catch(() => {});
    } else {
        sndWrong.currentTime = 0;
        sndWrong.play().catch(() => {});
    }
}

// --- Crypto ---
export async function sha256(message) {
    const msgBuffer  = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// --- Image Compression ---
export function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas    = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scale     = MAX_WIDTH / img.width;
            canvas.width    = MAX_WIDTH;
            canvas.height   = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
    };
}

// --- Arabic Text Helpers ---
export function isArabicText(text) {
    return /[\u0600-\u06FF]/.test(text);
}

export function countArabicWords(text) {
    return text.trim().split(/\s+/).filter(w => isArabicText(w)).length;
}

export function createCacheKey(text) {
    const clean = text.replace(/[\u064B-\u065F]/g, '').trim().replace(/\s+/g, '_');
    return btoa(unescape(encodeURIComponent(clean))).replace(/[/+=]/g, '');
}
