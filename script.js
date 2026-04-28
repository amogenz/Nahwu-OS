// ============================================================
// script.js  ← Entry Point Utama
// Tugasnya: init DOM elements, pasang event listeners,
//           lalu panggil modul-modul yang sudah dipisah.
// ============================================================

import { db } from './js/firebase.js';
import { ref, set, onValue, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import { setEls, els, setCurrentDatabase, resetQuizScore, DAWUH_PLAYLIST, setDawuhIndex, dawuhIndex } from './js/state.js';
import { startLearningCycle, loadPublicDawuh } from './js/quiz.js';
import { handleSecretTap, handleAdminLogin, closeAdmin } from './js/admin.js';
import { initSyarah }    from './js/syarah.js';
import { initComments }  from './js/comments.js';

// --- Visitor Counter ---
function initVisitorCounter() {
    const visitorRef = ref(db, 'visitor_count');
    set(visitorRef, increment(1));
    onValue(visitorRef, (snapshot) => {
        const count = snapshot.val() || 0;
        if (els.visitorCounter) {
            els.visitorCounter.innerHTML = `Telah dikunjungi: ${count.toLocaleString('id-ID')}x`;
        }
    });
}

// --- Page Navigation ---
function switchPage(pageName) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
}

// --- App Init ---
function initApp() {
    setEls({
        viewStart:      document.getElementById('view-start'),
        viewLoading:    document.getElementById('view-loading'),
        viewQuiz:       document.getElementById('view-quiz'),
        ctxSent:        document.getElementById('ctx-sentence'),
        ctxWord:        document.getElementById('ctx-word'),
        badge:          document.getElementById('badge-step'),
        qText:          document.getElementById('question-text'),
        options:        document.getElementById('options-container'),
        modal:          document.getElementById('modal-feedback'),
        mCard:          document.getElementById('modal-card'),
        mTitle:         document.getElementById('fb-title'),
        mIcon:          document.getElementById('fb-icon'),
        mMsg:           document.getElementById('fb-msg'),
        mImgArea:       document.getElementById('fb-image-area'),
        mImgSrc:        document.getElementById('dawuh-img-src'),
        mSpinner:       document.getElementById('img-spinner'),
        fbBtn:          document.getElementById('fb-btn'),
        soundToggle:    document.getElementById('sound-toggle'),
        adminPanel:     document.getElementById('admin-panel'),
        adminLogin:     document.getElementById('admin-login'),
        adminDash:      document.getElementById('admin-dash'),
        adminPass:      document.getElementById('admin-pass'),
        marqueeText:    document.getElementById('marquee-text'),
        visitorCounter: document.getElementById('visitor-counter')
    });

    // Admin
    document.getElementById('secret-logo').addEventListener('click', handleSecretTap);
    document.getElementById('btn-admin-login').addEventListener('click', handleAdminLogin);
    document.getElementById('btn-close-admin').addEventListener('click', closeAdmin);

    // Quiz
    document.getElementById('btn-start').addEventListener('click', startLearningCycle);
    document.getElementById('btn-back-home').addEventListener('click', () => {
        if (confirm('Yakin ingin kembali ke home? Progress quiz akan hilang.')) {
            els.viewQuiz.style.display  = 'none';
            els.viewStart.style.display = 'flex';
            resetQuizScore();
        }
    });

    document.querySelectorAll('.db-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.db-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            setCurrentDatabase(e.currentTarget.getAttribute('data-db'));
        });
    });

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = e.currentTarget.getAttribute('data-page');
            if (page) switchPage(page);
        });
    });

    // Marquee cycling
    if (els.marqueeText) {
        els.marqueeText.addEventListener('animationiteration', () => {
            const next = (dawuhIndex + 1) % DAWUH_PLAYLIST.length;
            setDawuhIndex(next);
            els.marqueeText.innerText = DAWUH_PLAYLIST[next];
        });
    }

    // Modal image
    els.mImgSrc.onload  = () => { els.mSpinner.style.display = 'none'; els.mImgSrc.style.display = 'block'; };
    els.mImgSrc.onerror = () => { els.mSpinner.style.display = 'none'; els.mImgArea.style.display = 'none'; els.mMsg.innerText = 'Gagal memuat gambar.'; };

    // Init modules
    initSyarah();
    initComments();
    loadPublicDawuh();
    initVisitorCounter();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
