// ============================================================
// js/quiz.js
// Logika utama Quiz / Belajar I'rob
// ============================================================

import { db } from './firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
    els,
    quizData, setQuizData,
    wordIndex, setWordIndex,
    stepIndex, setStepIndex,
    quizScore, resetQuizScore, incrementCorrect, incrementWrong,
    currentDatabase,
    dawuhImagesCache,
    DAWUH_PLAYLIST,
    setDawuhIndex, dawuhIndex
} from './state.js';
import { playSound } from './utils.js';
import { AMOGENZ_DB_LV1 } from '../amogenzdb-lv1.js';
import { AMOGENZ_DB_LV2 } from '../amogenzdb-lv2.js';
import { AMOGENZ_DB_SHOROF } from '../amogenzdb-shorof.js';

// --- Database Selector ---
function getSelectedDatabase() {
    switch (currentDatabase) {
        case 'lv1':    return AMOGENZ_DB_LV1;
        case 'lv2':    return AMOGENZ_DB_LV2;
        case 'shorof': return AMOGENZ_DB_SHOROF;
        default:       return AMOGENZ_DB_LV1;
    }
}

// --- LocalStorage: Seen Sentences ---
function getSeenSentences() {
    const key  = `nahwu_seen_indices_${currentDatabase}`;
    const seen = localStorage.getItem(key);
    return seen ? JSON.parse(seen) : [];
}

function markSentenceSeen(id) {
    if (id === 'ai_generated') return;
    const key  = `nahwu_seen_indices_${currentDatabase}`;
    const seen = getSeenSentences();
    if (!seen.includes(id)) {
        seen.push(id);
        localStorage.setItem(key, JSON.stringify(seen));
    }
}

// --- Marquee ---
export function setRandomMarquee() {
    if (!DAWUH_PLAYLIST.length) return;
    const idx = Math.floor(Math.random() * DAWUH_PLAYLIST.length);
    if (els.marqueeText) els.marqueeText.innerText = DAWUH_PLAYLIST[idx];
    setDawuhIndex(idx);
}

// --- Dawuh Images ---
export function loadPublicDawuh() {
    onValue(ref(db, 'dawuh_images'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const list = Object.values(data);
            // update cache in state
            import('./state.js').then(s => {
                s.setDawuhImagesCache(list);
                list.forEach(img => { const i = new Image(); i.src = img.url; });
            });
        } else {
            import('./state.js').then(s => s.setDawuhImagesCache([]));
        }
    });
}

// --- Pangkat / Rank ---
function getRankData(correct, total) {
    const wrong      = total - correct;
    const halfOrMore = wrong >= Math.ceil(total / 2);

    if (total === 0)     return { icon: "📖", rank: "Pemula",          color: "#8E8E93", msg: "Terus semangat belajar! Setiap langkah kecil adalah kemajuan." };
    if (wrong === 0)     return { icon: "⚔️",  rank: "Panglima Nahwu", color: "#FFD700", msg: "Luar biasa! Tak ada satupun yang salah. Engkau layak disebut Panglima Nahwu!" };
    if (wrong === 1)     return { icon: "🎖️", rank: "Komandan Nahwu", color: "#FF9F0A", msg: "Hampir sempurna! Satu kesalahan saja. Komandan Nahwu, teruslah pimpin barisan!" };
    if (wrong === 2)     return { icon: "🏅", rank: "Batalion Nahwu",  color: "#30D158", msg: "Bagus sekali! Dua kesalahan masih sangat baik. Batalion Nahwu siap tempur!" };
    if (halfOrMore)      return { icon: "🌱", rank: "Pemula",          color: "#8E8E93", msg: "Jangan menyerah! من جد وجد — Siapa yang bersungguh-sungguh, pasti berhasil. Ayo ulangi!" };
    return               { icon: "🛡️", rank: "Prajurit Nahwu",        color: "#007AFF", msg: "Cukup baik! Masih ada ruang untuk berkembang. Terus latih kaidahmu, wahai Prajurit!" };
}

// --- Core Quiz Flow ---
export async function startLearningCycle() {
    els.viewStart.style.display   = 'none';
    els.viewQuiz.style.display    = 'none';
    els.viewLoading.style.display = 'flex';

    setTimeout(() => {
        try {
            const DATABASE = getSelectedDatabase();
            const seenIds  = getSeenSentences();
            let available  = DATABASE.filter(q => !seenIds.includes(q.id_kalimat));
            if (available.length === 0) available = DATABASE;

            const selected = available[Math.floor(Math.random() * available.length)];
            setQuizData({ id: selected.id_kalimat, sentence: selected.teks_kalimat, analysis: selected.analysis });
            markSentenceSeen(selected.id_kalimat);
            setRandomMarquee();
            setWordIndex(0);
            setStepIndex(1);
            resetQuizScore();

            els.viewLoading.style.display = 'none';
            els.viewQuiz.style.display    = 'block';
            renderQuestion();

        } catch (err) {
            console.error('Error loading quiz:', err);
            alert('Terjadi kesalahan memuat data. Pastikan database sudah benar.');
            els.viewLoading.style.display = 'none';
            els.viewStart.style.display   = 'flex';
        }
    }, 600);
}

export function renderQuestion() {
    const curWord  = quizData.analysis[wordIndex];
    const curStep  = curWord.steps[stepIndex.toString()];
    const total    = Object.keys(curWord.steps).length;

    els.ctxSent.innerText  = quizData.sentence;
    els.ctxWord.innerText  = curWord.word;
    els.badge.innerText    = `LANGKAH ${stepIndex}/${total}`;
    els.qText.innerHTML    = curStep.question;
    els.options.innerHTML  = '';

    const shuffled = [...curStep.options].sort(() => Math.random() - 0.5);
    shuffled.forEach(opt => {
        const btn       = document.createElement('div');
        btn.className   = 'btn-option';
        btn.innerHTML   = `<span>${opt}</span> <i class="ph ph-caret-right"></i>`;
        btn.onclick     = () => handleAnswer(opt, curStep);
        els.options.appendChild(btn);
    });
}

function handleAnswer(ans, data) {
    const isCorrect = ans.trim().toLowerCase() === data.correct.trim().toLowerCase();

    playSound(isCorrect);
    els.mImgArea.style.display = 'none';
    els.mMsg.style.display     = 'block';
    els.mIcon.style.display    = 'block';

    if (isCorrect) incrementCorrect(); else incrementWrong();

    const totalSteps = Object.keys(quizData.analysis[wordIndex].steps).length;

    if (isCorrect) {
        els.mTitle.innerText    = 'Benar!';
        els.mTitle.style.color  = '#34C759';
        els.mIcon.innerText     = '✨';
        els.mMsg.innerText      = data.explanation;
        els.modal.style.display = 'flex';
        setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);

        els.fbBtn.onclick = () => {
            if (stepIndex < totalSteps) {
                els.mCard.style.transform = 'scale(0.9)';
                setTimeout(() => { els.modal.style.display = 'none'; }, 200);
                setStepIndex(stepIndex + 1);
                renderQuestion();
            } else {
                showRewardPhase();
            }
        };
    } else {
        els.mTitle.innerText    = 'Kurang Tepat';
        els.mTitle.style.color  = '#FF3B30';
        els.mIcon.innerText     = '❌';
        els.mMsg.innerHTML      = `Jawaban Benar: <b>${data.correct}</b><br><br>${data.explanation}`;
        els.modal.style.display = 'flex';
        setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);
        els.fbBtn.onclick = () => {
            els.mCard.style.transform = 'scale(0.9)';
            setTimeout(() => els.modal.style.display = 'none', 200);
        };
    }
}

function showRewardPhase() {
    els.mTitle.innerText    = 'Lafadz Selesai';
    els.mTitle.style.color  = '#FFD700';
    els.mIcon.style.display = 'none';

    if (dawuhImagesCache.length > 0) {
        const randImg = dawuhImagesCache[Math.floor(Math.random() * dawuhImagesCache.length)];
        els.mImgArea.style.display  = 'flex';
        els.mSpinner.style.display  = 'block';
        els.mImgSrc.style.display   = 'none';
        els.mImgSrc.src             = randImg.url;
        els.mMsg.innerText          = randImg.caption || 'Tetap Semangat!';
    } else {
        els.mMsg.innerText = 'Alhamdulillah. Lanjut?';
    }

    els.fbBtn.onclick = () => {
        els.mCard.style.transform = 'scale(0.9)';
        setTimeout(() => {
            els.modal.style.display = 'none';
            setTimeout(() => {
                if (wordIndex < quizData.analysis.length - 1) {
                    setWordIndex(wordIndex + 1);
                    setStepIndex(1);
                    renderQuestion();
                } else {
                    setWordIndex(0);
                    setStepIndex(1);
                    setQuizData(null);
                    showTransition('Kalimat Selesai', '', true);
                }
            }, 100);
        }, 200);
    };
}

function showTransition(title, msg, isNewSentence) {
    els.mImgArea.style.display = 'none';
    els.mMsg.style.display     = 'block';
    els.mIcon.style.display    = 'block';

    if (isNewSentence && quizScore.total > 0) {
        const rank      = getRankData(quizScore.correct, quizScore.total);
        const wrongCount = quizScore.total - quizScore.correct;

        els.mIcon.innerText    = rank.icon;
        els.mTitle.innerText   = 'Alhamdulillah! 🎉';
        els.mTitle.style.color = '#FFD700';
        els.mMsg.innerHTML = `
            <div style="text-align:center; margin-bottom: 12px;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">${rank.icon}</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: ${rank.color}; letter-spacing: 0.5px; margin-bottom: 4px;">${rank.rank}</div>
                <div style="display:flex; justify-content:center; gap:16px; margin: 10px 0;">
                    <div style="background:rgba(52,199,89,0.15); border:1px solid #34C759; border-radius:12px; padding:8px 16px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#34C759;">${quizScore.correct}</div>
                        <div style="font-size:0.65rem; color:#34C759; opacity:0.8;">BENAR</div>
                    </div>
                    <div style="background:rgba(255,59,48,0.15); border:1px solid #FF3B30; border-radius:12px; padding:8px 16px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#FF3B30;">${wrongCount}</div>
                        <div style="font-size:0.65rem; color:#FF3B30; opacity:0.8;">SALAH</div>
                    </div>
                    <div style="background:rgba(0,122,255,0.15); border:1px solid #007AFF; border-radius:12px; padding:8px 16px; text-align:center;">
                        <div style="font-size:1.4rem; font-weight:800; color:#007AFF;">${quizScore.total}</div>
                        <div style="font-size:0.65rem; color:#007AFF; opacity:0.8;">TOTAL</div>
                    </div>
                </div>
                <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.5; margin-top:8px; font-style:italic;">${rank.msg}</div>
            </div>`;
    } else {
        els.mIcon.innerText    = '🚀';
        els.mTitle.innerText   = title;
        els.mTitle.style.color = '#007AFF';
        els.mMsg.innerText     = msg;
    }

    els.modal.style.display = 'flex';
    els.fbBtn.onclick = () => {
        els.modal.style.display = 'none';
        if (isNewSentence) startLearningCycle();
        else renderQuestion();
    };
}
