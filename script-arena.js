// ============================================================
// Nahwu OS — Modul Arena & Studio Kuis Komunitas
// Dipecah dari script.js (batas ukuran push) — ES module.
// Menerima dependensi via initArena(ctx) agar tidak ada import
// sirkular kembali ke script.js.
// ============================================================
import { ref, onValue, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export const arenaState = { currentCommunityQuiz: null, currentCommunityIdx: 0 };

export function initArena(ctx) {
    const { db, els, escapeHTML, showBanner, playSound, switchPage } = ctx;

// ==========================================

// 1. FUNGSI PENARIK DATA KUIS DARI FIREBASE
function initCommunityQuizzesSync() {
    const quizGrid = document.getElementById('community-quiz-grid');
    if (!quizGrid) return;

    onValue(ref(db, 'community_quizzes'), (snapshot) => {
        const data = snapshot.val();
        quizGrid.innerHTML = '';

        if (data) {
            const quizzes = Object.values(data);
            quizzes.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

            quizzes.forEach(quiz => {
                const card = document.createElement('div');
                card.className = 'explore-item-card';
                card.style.position = 'relative';

card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; width:100%; margin-bottom: 6px;">
        <span style="font-size: 0.7rem; color: var(--ios-green); font-weight: 700;">● ${escapeHTML(quiz.category || 'UMUM').toUpperCase()}</span>
        <span style="font-size: 0.7rem; opacity: 0.6;"><i class="ph ph-play-circle"></i> ${quiz.plays_count || 0}x dimainkan</span>
    </div>
    <div class="explore-card-arabic" style="font-size: 1.2rem;">${escapeHTML(quiz.questions?.[0]?.word || quiz.title)}</div>
    <div style="font-size: 0.85rem; font-weight: 600; color: #fff; margin-top: 4px;">${escapeHTML(quiz.title)}</div>
    <div class="explore-card-meta" style="margin-top: 8px;">
        <span><i class="ph ph-user"></i> ${escapeHTML(quiz.author_name || 'Santri Anonim')}</span>
    </div>
`;

                card.onclick = (e) => {
                    e.stopPropagation();
                    startCommunityQuiz(quiz);
                };

                quizGrid.appendChild(card);
            });
        } else {
            quizGrid.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:13px; opacity:0.5; padding: 30px 0;">Belum ada kuis komunitas bray. Yuk buat yang pertama di menu Studio!</p>';
        }
    });
}

// 🔍 SYNC DATA EXPLORE LAFADZ DARI FIREBASE

function initExploreSyarahSync() {
    onValue(ref(db, 'syarah_cache'), (snapshot) => {
        const cacheData = snapshot.val();
        const badge = document.getElementById('cache-total-badge');
        const gridContainer = document.getElementById('explore-grid');
        
        if (!gridContainer) return;
        gridContainer.innerHTML = ''; 
        
        if (cacheData) {
            const items = Object.entries(cacheData);
            if (badge) badge.textContent = items.length;
            
            // Urutkan dari lafadz terbaru di atas
            items.sort((a, b) => {
                const timeA = a[1].created_at || 0;
                const timeB = b[1].created_at || 0;
                return timeB - timeA;
            });
            
            items.forEach(([key, value]) => {
                const card = document.createElement('div');
                card.className = 'explore-item-card';
                
                let formattedDate = "Baru";
                if (value.created_at) {
                    formattedDate = new Date(value.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short'
                    });
                }
                
                card.innerHTML = `
                    <div class="explore-card-arabic">${escapeHTML(value.original_input)}</div>
                    <div class="explore-card-meta"><i class="ph ph-calendar"></i> ${formattedDate}</div>
                `;
                
                card.onclick = () => {
                    showExploreDetail(value.original_input, value.result);
                };
                
                gridContainer.appendChild(card);
            });
        } else {
            if (badge) badge.textContent = '0';
            gridContainer.innerHTML = '<p style="grid-column: span 2; text-align:center; font-size:13px; opacity:0.5; padding: 30px 0;">Belum ada riwayat lafadz bray.</p>';
        }
    });
}

// 📖 FUNGSI RENDER DETAIL EXPLORE SYARAH (FIXED)
function showExploreDetail(title, resultRaw) {
    const mainView = document.getElementById('explore-main-view');
    const detailView = document.getElementById('explore-detail-view');
    const titleText = document.getElementById('explore-title-text');
    const detailContentDiv = document.getElementById('explore-detail-content');

    if (mainView) mainView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';
    if (titleText) titleText.textContent = title;
    
    if (!detailContentDiv) return;

    // Pecah langsung dari resultRaw tanpa replace di awal
    const lines = resultRaw.split('\n');
    
    const formattedHtml = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '<div class="spacer" style="height:10px"></div>'; 

        // 1. Escape karakter berbahaya dulu
        let safeLine = escapeHTML(trimmedLine);

        // 2. Baru ubah markdown **teks** menjadi <strong>teks</strong>
        safeLine = safeLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 3. Render ke pembungkus UI
        if (safeLine.startsWith('===')) {
            const label = safeLine.replace(/=/g, '').replace('LAFADZ:', '').trim();
            return `<div class="lafadz-header"><i class="ph ph-note"></i> LAFADZ: ${label}</div>`;
        }

        if (/^\d+\./.test(safeLine)) {
            return `<div class="analysis-point">${safeLine}</div>`;
        }

        return `<div class="normal-line">${safeLine}</div>`;
    }).join('');

    requestAnimationFrame(() => {
        detailContentDiv.innerHTML = formattedHtml;
        const contentArea = document.querySelector('#page-syarah .content-area');
        if (contentArea) contentArea.scrollTop = 0;
    });
}


// 2. FUNGSI UNTUK MEMAINKAN KUIS KOMUNITAS
function startCommunityQuiz(quiz) {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return showBanner("Soal kuis ini tidak valid atau kosong!");
    }

    arenaState.currentCommunityQuiz = quiz;
    arenaState.currentCommunityIdx = 0;

    // 🚨 FIX UTAMA: Pindahkan layar utama & tombol nav ke HOME secara instan!
    if (typeof switchPage === 'function') {
        switchPage('home');
    } else {
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.getElementById('page-home')?.classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-page="home"]')?.classList.add('active');
    }

    // Tampilkan View Kuis & Sembunyikan Start/Loading
    if (els.viewStart) els.viewStart.style.display = 'none';
    if (els.viewLoading) els.viewLoading.style.display = 'none';
    if (els.viewQuiz) els.viewQuiz.style.display = 'flex';

    // Render Soal Pertama
    renderCommunityQuestion();

    // Tambah Statistik Dimainkan
    if (quiz.id) {
        try {
            const playRef = ref(db, `community_quizzes/${quiz.id}/plays_count`);
            runTransaction(playRef, (current) => (current || 0) + 1).catch(() => {});
        } catch (e) {
            console.log("Skip update play count");
        }
    }
}

// 3. FUNGSI RENDER SOAL KUIS KOMUNITAS
function renderCommunityQuestion() {
    if (!arenaState.currentCommunityQuiz || !arenaState.currentCommunityQuiz.questions) return;

    const q = arenaState.currentCommunityQuiz.questions[arenaState.currentCommunityIdx];
    
    // 🚨 JIKA KUIS SELESAI: BALIKKAN KE TAB ARENA / KOMUNITAS!
    if (!q) {
        showBanner("Selamat! Kamu telah menyelesaikan kuis komunitas ini!");
        
        // Reset state
        arenaState.currentCommunityQuiz = null;
        arenaState.currentCommunityIdx = 0;

        // Sembunyikan view kuis, siapkan view start home untuk nanti
        if (els.viewStart) els.viewStart.style.display = 'flex';
        if (els.viewQuiz) els.viewQuiz.style.display = 'none';
        
        // 🚀 KEMBALIKAN KE TAB ARENA
        if (typeof switchPage === 'function') {
            switchPage('arena');
        }
        return;
    }

    if (els.badge) els.badge.textContent = `SOAL ${arenaState.currentCommunityIdx + 1} / ${arenaState.currentCommunityQuiz.questions.length}`;
    if (els.ctxSent) els.ctxSent.textContent = q.sentence || q.context || '-';
    if (els.ctxWord) els.ctxWord.textContent = q.word || '-';
    if (els.qText) els.qText.textContent = q.question || 'Pilih jawaban yang benar:';

    if (els.options) {
        els.options.innerHTML = '';
        const options = q.options || [];
        
        options.forEach((optText) => {
            const btn = document.createElement('div');
            btn.className = 'btn-option';
            btn.innerHTML = `<span>${optText}</span> <i class="ph ph-caret-right"></i>`;

            btn.onclick = () => {
                const correctOptText = q.options[q.correctIndex] || q.correct;
                checkCommunityAnswer(optText, correctOptText, q.explanation);
            };

            els.options.appendChild(btn);
        });
    }
}

// 4. FUNGSI CEK JAWABAN KUIS KOMUNITAS
function checkCommunityAnswer(selected, correct, explanation) {
    const isCorrect = (selected === correct);

    if (typeof playSound === 'function') playSound(isCorrect);
    if (els.mImgArea) els.mImgArea.style.display = 'none';
    if (els.mMsg) els.mMsg.style.display = 'block';
    if (els.mIcon) els.mIcon.style.display = 'block';

    if (isCorrect) {
        if (els.mTitle) { els.mTitle.innerText = "Benar!"; els.mTitle.style.color = "#4CAF50"; }
        if (els.mIcon) els.mIcon.innerHTML = '<i class="ph ph-sparkle"></i>';
        if (els.mMsg) els.mMsg.innerText = explanation || "Jawabanmu tepat sekali!";
    } else {
        if (els.mTitle) { els.mTitle.innerText = "Kurang Tepat"; els.mTitle.style.color = "#E5484D"; }
        if (els.mIcon) els.mIcon.innerHTML = '<i class="ph ph-x-circle"></i>';
        if (els.mMsg) els.mMsg.innerHTML = `Jawaban Benar: <b>${correct}</b><br><br>${explanation || ''}`;
    }

    if (els.modal) els.modal.style.display = 'flex';
    setTimeout(() => { if (els.mCard) els.mCard.style.transform = 'scale(1)'; }, 10);

    if (els.fbBtn) {
        els.fbBtn.onclick = () => {
            if (els.mCard) els.mCard.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (els.modal) els.modal.style.display = 'none';
                if (isCorrect) {
                    arenaState.currentCommunityIdx++;
                    renderCommunityQuestion();
                }
            }, 200);
        };
    }
}

// ==========================================
// 🏟️ LOGIKA ARENA SANTRI & SUB-TAB SWITCHING
// ==========================================
document.querySelectorAll('[data-sub-arena]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetSub = e.currentTarget.getAttribute('data-sub-arena');
        
        document.querySelectorAll('[data-sub-arena]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        document.querySelectorAll('.sub-page-arena').forEach(sp => sp.style.display = 'none');
        const targetElem = document.getElementById(`sub-arena-${targetSub}`);
        if (targetElem) targetElem.style.display = 'block';
    });
});

// ==========================================
// 🛠️ MANAJER STUDIO KUIS DINAMIS (1 - 14 SOAL)
// ==========================================
let studioQuestionCount = 0;
const MAX_QUESTIONS = 14;

function createQuestionBlockHTML(index) {
    const isFirst = (index === 1);
    return `
        <div class="q-block-item" data-q-index="${index}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--ios-blue);">Soal #${index}</span>
                ${!isFirst ? `<button type="button" class="btn-remove-q" onclick="removeStudioQuestionBlock(${index})" style="background: rgba(229,72,77,0.2); border: 1px solid rgba(229,72,77,0.4); color: #E5484D; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer;"><i class="ph ph-trash"></i> Hapus</button>` : ''}
            </div>

            <label style="font-size: 0.78rem; color: var(--text-muted);">Kalimat Arab Lengkap (Konteks)</label>
            <input type="text" class="glass-field q-sentence" placeholder="قُلْ هُوَ اللَّهُ أَحَدٌ" maxlength="100" style="font-family: 'Amiri', serif; font-size: 1.1rem; direction: rtl;">

            <label style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: block;">Lafadz / Kata yang Ditanyakan</label>
            <input type="text" class="glass-field q-word" placeholder="قُلْ" maxlength="30" style="font-family: 'Amiri', serif; font-size: 1.1rem; direction: rtl;">

            <label style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: block;">Pertanyaan Soal</label>
            <input type="text" class="glass-field q-question" placeholder="Apa kedudukan / jenis kata dari lafadz ini?" maxlength="120">

            <label style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: block;">Pilihan Jawaban (A, B, C, D)</label>
            <input type="text" class="glass-field q-opt1" placeholder="Opsi A (Misal: Fi'il Amar)" maxlength="40" style="margin-bottom: 5px;">
            <input type="text" class="glass-field q-opt2" placeholder="Opsi B (Misal: Isim Mufrad)" maxlength="40" style="margin-bottom: 5px;">
            <input type="text" class="glass-field q-opt3" placeholder="Opsi C (Misal: Huruf Jar)" maxlength="40" style="margin-bottom: 5px;">
            <input type="text" class="glass-field q-opt4" placeholder="Opsi D (Misal: Fi'il Madhi)" maxlength="40" style="margin-bottom: 5px;">

            <label style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: block;">Kunci Jawaban Benar</label>
            <select class="glass-field q-correct" style="color: #fff; background: rgba(0,0,0,0.5);">
                <option value="0">Opsi A</option>
                <option value="1">Opsi B</option>
                <option value="2">Opsi C</option>
                <option value="3">Opsi D</option>
            </select>

            <label style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; display: block;">Syarah / Penjelasan Singkat (Opsional)</label>
            <input type="text" class="glass-field q-explanation" placeholder="Misal: Termasuk Fi'il Amar mabni atas sukun." maxlength="150">
        </div>
    `;
}

function addStudioQuestionBlock() {
    if (studioQuestionCount >= MAX_QUESTIONS) {
        return showBanner(`Batas maksimal adalah ${MAX_QUESTIONS} soal per kuis!`);
    }
    studioQuestionCount++;
    const container = document.getElementById('quiz-questions-list');
    if (container) {
        container.insertAdjacentHTML('beforeend', createQuestionBlockHTML(studioQuestionCount));
    }
    updateStudioQuestionBadge();
}

window.removeStudioQuestionBlock = function(index) {
    const block = document.querySelector(`.q-block-item[data-q-index="${index}"]`);
    if (block) {
        block.remove();
        reindexStudioQuestionBlocks();
    }
};

function reindexStudioQuestionBlocks() {
    const blocks = document.querySelectorAll('.q-block-item');
    studioQuestionCount = blocks.length;
    blocks.forEach((b, idx) => {
        const newNum = idx + 1;
        b.setAttribute('data-q-index', newNum);
        const titleSpan = b.querySelector('span');
        if (titleSpan) titleSpan.textContent = `Soal #${newNum}`;
        const delBtn = b.querySelector('.btn-remove-q');
        if (delBtn) delBtn.setAttribute('onclick', `removeStudioQuestionBlock(${newNum})`);
    });
    updateStudioQuestionBadge();
}

function updateStudioQuestionBadge() {
    const badge = document.getElementById('q-count-badge');
    if (badge) badge.textContent = studioQuestionCount;

    const btnAdd = document.getElementById('btn-add-question-block');
    if (btnAdd) {
        btnAdd.style.display = (studioQuestionCount >= MAX_QUESTIONS) ? 'none' : 'block';
    }
}

function initStudioForm() {
    const container = document.getElementById('quiz-questions-list');
    if (container && container.children.length === 0) {
        studioQuestionCount = 0;
        addStudioQuestionBlock();
    }
}

// Jalankan form studio secara otomatis
initStudioForm();

document.getElementById('btn-add-question-block')?.addEventListener('click', () => {
    addStudioQuestionBlock();
});

    return { initCommunityQuizzesSync, initExploreSyarahSync, initStudioForm };
}
