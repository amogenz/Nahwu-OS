
    import { AMOGENZ_DB_LV1 } from './amogenzdb-lv1.js';
    import { AMOGENZ_DB_LV2 } from './amogenzdb-lv2.js';
    import { AMOGENZ_DB_SHOROF } from './amogenzdb-shorof.js'; 
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getDatabase, ref, push, onValue, remove, query, limitToLast, set, get, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

    // --- 1. CONFIG ---
    const firebaseConfig = { apiKey: "AIzaSyBDyEfe83-_CzRchqcO_lLnuO6Rg9_AF_8", authDomain: "amogenz.firebaseapp.com", databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "amogenz", storageBucket: "amogenz.firebasestorage.app", messagingSenderId: "864003468268", appId: "1:864003468268:web:7c861806529a0dacd66ec9" };
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    const sndCorrect = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const sndWrong = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
    sndCorrect.load(); sndWrong.load();

    // --- 2. DATA TERPUSAT: DAWUH PLAYLIST ---
    const DAWUH_PLAYLIST = [
        "من تبحر فى علم النحو اهتدى الى كل العلوم - Barangsiapa mendalami ilmu Nahwu, akan mendapat petunjuk ke segala ilmu.",
        "تعلموا العربية فإنها من دينكم - Pelajarilah bahasa Arab, karena ia adalah bagian dari agamamu. (Umar bin Khattab)",
        "النحو في الكلام كالملح في الطعام - Nahwu dalam ucapan ibarat garam dalam masakan.",
        "الخطأ في النحو كالجذام في الوجه - Kesalahan dalam Nahwu ibarat cacat di wajah.",
        "من جد وجد - Barangsiapa bersungguh-sungguh, pasti dapat.",
        "Kalam (ucapan) menurut ahli nahwu adalah lafazh yang tersusun yang memberi faedah dengan disengaja.",
        "Awal ilmu adalah diam, kemudian mendengarkan, kemudian menghafal, kemudian mengamalkan.",
        "Ilmu tanpa amal bagaikan pohon tanpa buah.",
        "Jangan takut salah I'rob, karena dari kesalahan itulah kita memahami kaidah yang benar.",
        "Setiap Fa'il itu Rafa', setiap Maf'ul itu Nashob. Pahami kaidah ini sebagai pondasi.",
        "Tanda I'rob bukan sekedar harakat, tapi cerminan kedudukan kata dalam kalimat.",
        "Keutamaan Nahwu bagi lisan, seperti garam bagi masakan.",
        "Jadikan kitab Jurumiyah & Imrithi sebagai sahabat setiamu dalam memahami agama."
    ];
    let dawuhIndex = 0;

    // --- 3. STATE ---
    let quizData = null;
    let wordIndex = 0;
    let stepIndex = 1;
    let dawuhImagesCache = [];
    let uploadBase64 = null;
    let tapCount = 0;
    let tapTimer;
    let quizScore = { correct: 0, wrong: 0, total: 0 }; // Track score per session
    const SECRET_HASH = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa";
    const ADMIN_PASSWORD_HASH = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa"; // Hash untuk
    let els = {};
    let currentDatabase = 'lv1'; // Default database
    let isAdminLoggedIn = false;
    let adminUploadImage = null;

    // --- 4. FUNGSI PENDUKUNG ---
    function loadPublicDawuh() {
        onValue(ref(db, 'dawuh_images'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                dawuhImagesCache = Object.values(data);
                dawuhImagesCache.forEach(img => { const i = new Image(); i.src = img.url; });
            } else { dawuhImagesCache = []; }
        });
    }

    function updateMarquee(text) {
        if(els.marqueeText) els.marqueeText.innerText = text;
    }

    function setRandomMarquee() {
        if (DAWUH_PLAYLIST.length > 0) {
            const randomIdx = Math.floor(Math.random() * DAWUH_PLAYLIST.length);
            updateMarquee(DAWUH_PLAYLIST[randomIdx]);
            dawuhIndex = randomIdx;
        }
    }

    // Visitor Counter
    function initVisitorCounter() {
        const visitorRef = ref(db, 'visitor_count');
        
        // Increment visitor count
        set(visitorRef, increment(1));
        
        // Listen to changes
        onValue(visitorRef, (snapshot) => {
            const count = snapshot.val() || 0;
            if (els.visitorCounter) {
                els.visitorCounter.innerHTML = `Telah dikunjungi: ${count.toLocaleString('id-ID')}x`;
            }
        });
    }

    // Database Selection
    function getSelectedDatabase() {
        switch(currentDatabase) {
            case 'lv1':
                return AMOGENZ_DB_LV1;
            case 'lv2':
                return AMOGENZ_DB_LV2;
            case 'shorof':
                return AMOGENZ_DB_SHOROF;
            default:
                return AMOGENZ_DB_LV1;
        }
    }

    function getSeenSentences() { 
        const key = `nahwu_seen_indices_${currentDatabase}`;
        const seen = localStorage.getItem(key); 
        return seen ? JSON.parse(seen) : []; 
    }
    
    function markSentenceSeen(id) { 
        if (id !== "ai_generated") { 
            const key = `nahwu_seen_indices_${currentDatabase}`;
            const seen = getSeenSentences(); 
            if (!seen.includes(id)) { 
                seen.push(id); 
                localStorage.setItem(key, JSON.stringify(seen)); 
            } 
        } 
    }

    function playSound(isCorrect) { 
        if (!els.soundToggle || !els.soundToggle.checked) return; 
        if (isCorrect) { 
            sndCorrect.currentTime = 0; 
            sndCorrect.play().catch(e => {}); 
        } else { 
            sndWrong.currentTime = 0; 
            sndWrong.play().catch(e => {}); 
        } 
    }

    function handleSecretTap() { 
        tapCount++; 
        clearTimeout(tapTimer); 
        tapTimer = setTimeout(() => tapCount = 0, 500); 
        if (tapCount === 3) { 
            els.adminPanel.style.display = 'flex'; 
            tapCount = 0; 
        } 
    }
    
    async function handleAdminLogin() { 
        const hash = await sha256(els.adminPass.value); 
        if (hash === SECRET_HASH) unlockAdminPanel(); 
        else alert("Sandi Salah!"); 
    }
    
    function closeAdmin() { 
        els.adminPanel.style.display = 'none'; 
        els.adminPass.value = ''; 
        els.adminLogin.style.display = 'block'; 
        els.adminDash.style.display = 'none'; 
    }
    
    async function sha256(message) { 
        const msgBuffer = new TextEncoder().encode(message); 
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); 
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''); 
    }
    
    function compressImage(file, callback) { 
        const reader = new FileReader(); 
        reader.readAsDataURL(file); 
        reader.onload = (event) => { 
            const img = new Image(); 
            img.src = event.target.result; 
            img.onload = () => { 
                const canvas = document.createElement('canvas'); 
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width; 
                canvas.width = MAX_WIDTH; 
                canvas.height = img.height * scaleSize; 
                const ctx = canvas.getContext('2d'); 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
                callback(canvas.toDataURL('image/jpeg', 0.8)); 
            } 
        } 
    }
    
    function unlockAdminPanel() { 
        els.adminLogin.style.display = 'none'; 
        els.adminDash.style.display = 'block'; 
        els.adminDash.innerHTML = `
            <div class="admin-tabs">
                <button class="tab-btn active" id="tab-url">Link URL</button>
                <button class="tab-btn" id="tab-upl">Upload Galeri</button>
            </div>
            <div id="form-url">
                <input type="text" id="dawuh-url" class="glass-field" placeholder="https://...">
            </div>
            <div id="form-upl" style="display:none;">
                <img id="img-preview" class="preview-img-box">
                <div class="file-upload-area">
                    <i class="ph ph-upload-simple" style="font-size:24px;"></i><br>
                    Klik untuk Pilih Foto
                    <input type="file" id="file-inp" accept="image/*">
                </div>
            </div>
            <input type="text" id="dawuh-caption" class="glass-field" placeholder="Keterangan (Opsional)" style="margin-top:10px;">
            <button id="btn-save-img" class="btn-primary" style="margin-top: 10px; background: var(--ios-green);">Simpan Gambar</button>
            <h3 style="margin-top: 20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Galeri Dawuh</h3>
            <div id="admin-list" class="suggestion-list" style="margin-top: 10px;"></div>
        `; 
        
        const btnUrl = document.getElementById('tab-url'); 
        const btnUpl = document.getElementById('tab-upl'); 
        const boxUrl = document.getElementById('form-url'); 
        const boxUpl = document.getElementById('form-upl'); 
        const inpUrl = document.getElementById('dawuh-url'); 
        let mode = 'url'; 
        
        btnUrl.onclick = () => { 
            mode = 'url'; 
            btnUrl.classList.add('active'); 
            btnUpl.classList.remove('active'); 
            boxUrl.style.display = 'block'; 
            boxUpl.style.display = 'none'; 
        }; 
        
        btnUpl.onclick = () => { 
            mode = 'upl'; 
            btnUpl.classList.add('active'); 
            btnUrl.classList.remove('active'); 
            boxUpl.style.display='block'; 
            boxUrl.style.display='none'; 
        }; 
        
        document.getElementById('file-inp').addEventListener('change', (e) => { 
            if (e.target.files[0]) { 
                compressImage(e.target.files[0], (base64) => { 
                    uploadBase64 = base64; 
                    const preview = document.getElementById('img-preview'); 
                    preview.src = base64; 
                    preview.style.display = 'block'; 
                }); 
            } 
        }); 
        
        document.getElementById('btn-save-img').addEventListener('click', () => { 
            const cap = document.getElementById('dawuh-caption').value.trim(); 
            let finalUrl = (mode === 'url') ? inpUrl.value.trim() : uploadBase64; 
            if (!finalUrl) return alert("Gambar belum dipilih/diisi!"); 
            push(ref(db, 'dawuh_images'), { url: finalUrl, caption: cap }).then(() => { 
                alert("Gambar Berhasil Disimpan!"); 
                inpUrl.value = ''; 
                document.getElementById('dawuh-caption').value = ''; 
                uploadBase64 = null; 
                document.getElementById('img-preview').style.display = 'none'; 
            }); 
        }); 
        
        loadAdminList(); 
    }
    
    function loadAdminList() { 
        onValue(ref(db, 'dawuh_images'), (snapshot) => { 
            const list = document.getElementById('admin-list'); 
            if (!list) return; 
            list.innerHTML = ''; 
            const data = snapshot.val(); 
            
            if (data) { 
                Object.entries(data).forEach(([key, val]) => { 
                    const div = document.createElement('div'); 
                    div.className = 'suggest-item'; 
                    div.style.display = 'flex';
                    div.style.flexDirection = 'row';
                    div.style.justifyContent = 'space-between';
                    div.style.alignItems = 'center';
                    div.style.gap = '10px';

                    const leftDiv = document.createElement('div'); 
                    leftDiv.style.cssText = "display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;"; 
                    leftDiv.innerHTML = `
                        <img src="${val.url}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; flex-shrink:0;"> 
                        <span style="font-size:12px; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${val.caption || 'Tanpa Keterangan'}</span>
                    `; 
                    
                    const delBtn = document.createElement('button'); 
                    delBtn.innerText = "Hapus"; 
                    delBtn.style.cssText = "background:var(--ios-red); border:none; color:white; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; flex-shrink:0;"; 
                    delBtn.onclick = () => { 
                        if (confirm("Yakin mau hapus gambar ini?")) remove(ref(db, `dawuh_images/${key}`)); 
                    }; 
                    
                    div.appendChild(leftDiv); 
                    div.appendChild(delBtn); 
                    list.appendChild(div); 
                }); 
            } else {
                list.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px;">Galeri kosong.</p>';
            }
        }); 
    }

    // --- 5. MAIN LOGIC (soal) ---
    async function startLearningCycle() {
        els.viewStart.style.display = 'none';
        els.viewQuiz.style.display = 'none';
        els.viewLoading.style.display = 'flex';

        setTimeout(() => {
            try {
                const DATABASE = getSelectedDatabase();
                const seenIds = getSeenSentences();
                let availableQuizzes = DATABASE.filter(q => !seenIds.includes(q.id_kalimat));
                
                if (availableQuizzes.length === 0) {
                    availableQuizzes = DATABASE;
                }

                const selectedQuiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];

                quizData = {
                    id: selectedQuiz.id_kalimat,
                    sentence: selectedQuiz.teks_kalimat,
                    analysis: selectedQuiz.analysis
                };

                markSentenceSeen(quizData.id);
                setRandomMarquee();

                wordIndex = 0; 
                stepIndex = 1;
                quizScore = { correct: 0, wrong: 0, total: 0 };
                
                els.viewLoading.style.display = 'none';
                els.viewQuiz.style.display = 'block';
                
                renderQuestion();

            } catch (error) {
                console.error("Error loading quiz:", error);
                alert("Terjadi kesalahan memuat data. Pastikan database sudah benar.");
                els.viewLoading.style.display = 'none';
                els.viewStart.style.display = 'flex';
            }
        }, 600); 
    }

    function renderQuestion() {
        const curWord = quizData.analysis[wordIndex];
        const curStep = curWord.steps[stepIndex.toString()];
        const totalSteps = Object.keys(curWord.steps).length;

        els.ctxSent.innerText = quizData.sentence;
        els.ctxWord.innerText = curWord.word;
        els.badge.innerText = `LANGKAH ${stepIndex}/${totalSteps}`;
        els.qText.innerHTML = curStep.question;
        els.options.innerHTML = '';
        
        const shuffled = [...curStep.options].sort(() => Math.random() - 0.5);
        shuffled.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'btn-option';
            btn.innerHTML = `<span>${opt}</span> <i class="ph ph-caret-right"></i>`;
            btn.onclick = () => handleAnswer(opt, curStep);
            els.options.appendChild(btn);
        });
    }

    function handleAnswer(ans, data) {
        const cleanUser = ans.trim().toLowerCase();
        const cleanCorrect = data.correct.trim().toLowerCase();
        const isCorrect = cleanUser === cleanCorrect;

        playSound(isCorrect);
        els.mImgArea.style.display = 'none'; 
        els.mMsg.style.display = 'block';
        els.mIcon.style.display = 'block';

        // Track score
        quizScore.total++;
        if (isCorrect) quizScore.correct++;
        else quizScore.wrong++;

        const currentWordData = quizData.analysis[wordIndex];
        const totalSteps = Object.keys(currentWordData.steps).length;

        if (isCorrect) {
            els.mTitle.innerText = "Benar!"; 
            els.mTitle.style.color = "#34C759"; 
            els.mIcon.innerText = "✨";
            els.mMsg.innerText = data.explanation; 
            els.modal.style.display = 'flex';
            setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);
            
            els.fbBtn.onclick = () => {
                if (stepIndex < totalSteps) {
                    els.mCard.style.transform = 'scale(0.9)'; 
                    setTimeout(() => { els.modal.style.display = 'none'; }, 200);
                    stepIndex++; 
                    renderQuestion();
                } else {
                    showRewardPhase(); 
                }
            };

        } else {
            els.mTitle.innerText = "Kurang Tepat"; 
            els.mTitle.style.color = "#FF3B30"; 
            els.mIcon.innerText = "❌";
            els.mMsg.innerHTML = `Jawaban Benar: <b>${data.correct}</b><br><br>${data.explanation}`;
            els.modal.style.display = 'flex';
            setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);
            els.fbBtn.onclick = () => { 
                els.mCard.style.transform = 'scale(0.9)'; 
                setTimeout(() => els.modal.style.display = 'none', 200); 
            };
        }
    }

    function showRewardPhase() {
        els.mTitle.innerText = "Lafadz Selesai"; 
        els.mTitle.style.color = "#FFD700"; 
        els.mIcon.style.display = 'none';
        
        if (dawuhImagesCache.length > 0) {
            const randomIdx = Math.floor(Math.random() * dawuhImagesCache.length);
            const randImg = dawuhImagesCache[randomIdx];
            els.mImgArea.style.display = 'flex'; 
            els.mSpinner.style.display = 'block'; 
            els.mImgSrc.style.display = 'none';
            els.mImgSrc.src = randImg.url; 
            els.mMsg.innerText = randImg.caption || "Tetap Semangat!";
        } else { 
            els.mMsg.innerText = "Alhamdulillah. Lanjut?"; 
        }

        els.fbBtn.onclick = () => {
            els.mCard.style.transform = 'scale(0.9)';
            setTimeout(() => {
                els.modal.style.display = 'none'; 
                setTimeout(() => {
                    if (wordIndex < quizData.analysis.length - 1) {
                        wordIndex++; 
                        stepIndex = 1; 
                        renderQuestion();
                    } else {
                        wordIndex = 0; 
                        stepIndex = 1; 
                        quizData = null;
                        showTransition("Kalimat Selesai", "من تبحر فى علم النحو اهتدى الى كل العلوم\n\nSiap lanjut kalimat baru?", true);
                    }
                }, 100);
            }, 200);
        };
    }

    function getRankData(correct, total) {
        const wrong = total - correct;
        const halfOrMore = wrong >= Math.ceil(total / 2);

        if (total === 0) return {
            icon: "📖", rank: "Pemula", color: "#8E8E93",
            msg: "Terus semangat belajar! Setiap langkah kecil adalah kemajuan."
        };
        if (wrong === 0) return {
            icon: "⚔️", rank: "Panglima Nahwu", color: "#FFD700",
            msg: "Luar biasa! Tak ada satupun yang salah. Engkau layak disebut Panglima Nahwu!"
        };
        if (wrong === 1) return {
            icon: "🎖️", rank: "Komandan Nahwu", color: "#FF9F0A",
            msg: "Hampir sempurna! Satu kesalahan saja. Komandan Nahwu, teruslah pimpin barisan!"
        };
        if (wrong === 2) return {
            icon: "🏅", rank: "Batalion Nahwu", color: "#30D158",
            msg: "Bagus sekali! Dua kesalahan masih sangat baik. Batalion Nahwu siap tempur!"
        };
        if (halfOrMore) return {
            icon: "🌱", rank: "Pemula", color: "#8E8E93",
            msg: "Jangan menyerah! من جد وجد — Siapa yang bersungguh-sungguh, pasti berhasil. Ayo ulangi!"
        };
        // Salah kurang dari setengah tapi lebih dari 2
        return {
            icon: "🛡️", rank: "Prajurit Nahwu", color: "#007AFF",
            msg: "Cukup baik! Masih ada ruang untuk berkembang. Terus latih kaidahmu, wahai Prajurit!"
        };
    }

    function showTransition(title, msg, isNewSentence) {
        els.mImgArea.style.display = 'none';
        els.mMsg.style.display = 'block';
        els.mIcon.style.display = 'block';

        if (isNewSentence && quizScore.total > 0) {
            // Show rank panel
            const rank = getRankData(quizScore.correct, quizScore.total);
            const wrongCount = quizScore.total - quizScore.correct;
            
            els.mIcon.innerText = rank.icon;
            els.mIcon.style.display = 'block';
            els.mTitle.innerText = "Alhamdulillah! 🎉";
            els.mTitle.style.color = "#FFD700";
            
            // Build score + rank HTML inside modal
            els.mMsg.innerHTML = `
                <div style="text-align:center; margin-bottom: 12px;">
                    <div style="font-size: 2.2rem; margin-bottom: 6px;">${rank.icon}</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: ${rank.color}; letter-spacing: 0.5px; margin-bottom: 4px;">${rank.rank}</div>
                    <div style="display:flex; justify-content:center; gap:16px; margin: 10px 0;">
                        <div style="background: rgba(52,199,89,0.15); border: 1px solid #34C759; border-radius: 12px; padding: 8px 16px; text-align:center;">
                            <div style="font-size:1.4rem; font-weight:800; color:#34C759;">${quizScore.correct}</div>
                            <div style="font-size:0.65rem; color:#34C759; opacity:0.8;">BENAR</div>
                        </div>
                        <div style="background: rgba(255,59,48,0.15); border: 1px solid #FF3B30; border-radius: 12px; padding: 8px 16px; text-align:center;">
                            <div style="font-size:1.4rem; font-weight:800; color:#FF3B30;">${wrongCount}</div>
                            <div style="font-size:0.65rem; color:#FF3B30; opacity:0.8;">SALAH</div>
                        </div>
                        <div style="background: rgba(0,122,255,0.15); border: 1px solid #007AFF; border-radius: 12px; padding: 8px 16px; text-align:center;">
                            <div style="font-size:1.4rem; font-weight:800; color:#007AFF;">${quizScore.total}</div>
                            <div style="font-size:0.65rem; color:#007AFF; opacity:0.8;">TOTAL</div>
                        </div>
                    </div>
                    <div style="font-size:0.82rem; color: var(--text-muted); line-height:1.5; margin-top: 8px; font-style: italic;">${rank.msg}</div>
                </div>
            `;

        } else {
            els.mIcon.innerText = "🚀"; 
            els.mTitle.innerText = title; 
            els.mTitle.style.color = "#007AFF"; 
            els.mMsg.innerText = msg;
        }
        
        els.modal.style.display = 'flex';
        
        els.fbBtn.onclick = () => {
            els.modal.style.display = 'none';
            
            if (isNewSentence) {
                startLearningCycle();
            } else {
                renderQuestion();
            }
        };
    }

    // --- 6. PAGE NAVIGATION ---
    function switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(`page-${pageName}`).classList.add('active');
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    }

    // --- 7. SYARAH AI FUNCTIONS ---

    function isArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF]/;
        return arabicRegex.test(text);
    }

    function countArabicWords(text) {
        return text.trim().split(/\s+/).filter(word => isArabicText(word)).length;
    }

    // Fungsi pembantu untuk membuat ID unik di Firebase dari lafadz Arab
    function createCacheKey(text) {
    // Hilangkan harakat dan ubah spasi jadi underscore agar aman masuk Firebase
    const cleanText = text.replace(/[\u064B-\u065F]/g, "").trim().replace(/\s+/g, '_');
    return btoa(unescape(encodeURIComponent(cleanText))).replace(/[/+=]/g, ""); 
}

async function analyzeSyarah() {
    const input = document.getElementById('arabic-input').value.trim();
    const resultArea = document.getElementById('syarah-result');
    const loadingArea = document.getElementById('syarah-loading');
    const resultDiv = document.getElementById('syarah-content');
    
    // 1. Validasi Input
    if (!input) {
        alert('Mohon masukkan lafadz Arab terlebih dahulu!');
        return;
    }
    
    if (typeof isArabicText === 'function' && !isArabicText(input)) {
        alert('Hanya kalimat Arab yang diperbolehkan!');
        return;
    }
    
    const wordCount = input.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount > 7) {
        alert(`Kalimat terlalu panjang! (${wordCount} kata). Maksimal 7 kata agar analisis mendalam.`);
        return;
    }

    // 2. Cek Koneksi Internet
    if (!navigator.onLine) {
        alert('Sepertinya kamu sedang offline. Fitur Syarah AI memerlukan internet.');
        return;
    }
    
    // 3. UI Feedback - Mulai Loading
    resultArea.style.display = 'none';
    loadingArea.style.display = 'flex';
  
    // ==========================================
    // TAHAP 1: CEK GUDANG CACHE FIREBASE DULU
    // ==========================================
    const cacheKey = createCacheKey(input);
    const cacheRef = ref(db, `syarah_cache/${cacheKey}`);

    try {
        const snapshot = await get(cacheRef);
        if (snapshot.exists()) {
            // DATA DITEMUKAN DI FIREBASE!
            const cachedData = snapshot.val();
            
            loadingArea.style.display = 'none';
            resultArea.style.display = 'block';
            
            // Langsung tampilkan hasilnya tanpa panggil API AI
            displaySyarahResult(cachedData.result);
            console.log("⚡ [CACHE HIT] Diambil dari Firebase! Hemat API Key.");
            
            return; // BERHENTI DI SINI. Sisa kode di bawah tidak akan dijalankan.
        }
    } catch (e) {
        console.warn("Gagal cek cache Firebase, lanjut ke AI:", e);
    }
    // ==========================================

    // 4. Pengaturan API URL
    const hostname = window.location.hostname;
    let apiUrl = 'https://nahwu-os-git-playground-ammos-projects-0b62d4a2.vercel.app/api/syarah';

    if (hostname.includes('amogenz.xyz')) {
        apiUrl = 'https://nahwu.amogenz.xyz/api/syarah';
    } else if (hostname.includes('amogenz.my.id')) {
        apiUrl = 'https://nahwu.amogenz.my.id/api/syarah';
    }

    // --- LOGIC ANALISIS AI STREAMING ---
    try {
        const promptText = `Analisis kalimat Arab berikut per lafadz dengan sangat detail sesuai kaidah ilmu Nahwu dan Shorof:
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
8. Alasan Tanda: [Contoh: Isim Mufrad/Asmaul Khomsah/Af'alul Khomsah, dll] + dalil dari jurumiyah, imrithi, dan  al fiyah (kalau memang ada)
9. Bina'nya: [Jika Mabni, sebutkan Mabni 'ala apa. Jika Fi'il sebutkan Bina' Shohih/Mu'tal dll]
10. Shighotnya: [Jenis kata secara Shorof: Madhi/Mudhari/Masdar/Isim Fa'il dll]
11. Tasrifnya: dari istilahy dan lughowinya [Penjelasan rinci asal kata, perubahan dari bentuk asal ke bentuk sekarang]

PENTING HARGA MATI !!! Berikan jawaban secara lengkap sampai tuntas hingga poin ke-11 untuk setiap kata.  Jangan memotong penjelasan di tengah kalimat. PASTIKAN SELESAI DAN KOMPLIT

Gunakan Bahasa Indonesia yang mudah dipahami santri. Pisahkan antar kata dengan pembatas ===.`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText })
        });

        if (!response.ok) throw new Error('Gagal menghubungi AI.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let cumulativeText = "";
        let buffer = ""; 
        let hasStarted = false; 

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop(); 

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                try {
                    const jsonStr = trimmedLine.replace('data: ', '').trim();
                    const data = JSON.parse(jsonStr);
                    
                    if (data.candidates && data.candidates[0].content.parts[0].text) {
                        if (!hasStarted) {
                            hasStarted = true;
                            loadingArea.style.display = 'none';
                            resultArea.style.display = 'block';
                            resultDiv.innerHTML = "";
                        }

                        cumulativeText += data.candidates[0].content.parts[0].text;
                        displaySyarahResult(cumulativeText); 
                    }
                } catch (e) {
                    buffer = line + '\n' + buffer;
                }
            }
        }

        if (!hasStarted) {
            throw new Error('AI tidak memberikan respon. Coba ulangi.');
        }

        // ==========================================
        // TAHAP 2: SIMPAN HASIL AI KE FIREBASE
        // ==========================================
        // Setelah loop while selesai, berarti teks AI sudah komplit.
        // Kita simpan ke database agar pencarian berikutnya tidak perlu pakai AI lagi.
        if (cumulativeText && cumulativeText.length > 50) {
            try {
                await set(cacheRef, {
                    original_input: input,
                    result: cumulativeText,
                    created_at: Date.now()
                });
                console.log("✅ [CACHE SAVED] Lafadz baru berhasil disimpan ke database.");
            } catch (saveErr) {
                console.warn("Gagal menyimpan ke cache Firebase:", saveErr);
            }
        }
        // ==========================================

    } 
    catch (error) {
        console.error('Syarah Error:', error);
        alert('Maaf, kendala: ' + error.message);
    } 
    finally {
        loadingArea.style.display = 'none';
    }
}


// Fungsi Display agar TIDAK "Kotak dalam Kotak"

    function displaySyarahResult(result) {
    const resultDiv = document.getElementById('syarah-content');
    const resultContainer = document.getElementById('syarah-result');
    
    // 1. Bersihkan Markdown Bold (**teks**) menjadi <strong>
    // Kita tambahkan penanganan agar teks yang belum tutup (misal **teks...) tidak rusak
    let cleanText = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Pecah per baris
    const lines = cleanText.split('\n');
    
    const formattedHtml = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '<div class="spacer" style="height:10px"></div>'; 

        // Jika baris adalah Header (=== LAFADZ ===)
        if (trimmedLine.startsWith('===')) {
            const label = trimmedLine.replace(/=/g, '').replace('LAFADZ:', '').trim();
            return `<div class="lafadz-header">📝 LAFADZ: ${label}</div>`;
        }

        // Jika baris adalah Poin (1. Jenis: ...)
        // Regex diperkuat agar tetap rapi saat teks baru setengah jalan
        if (/^\d+\./.test(trimmedLine)) {
            return `<div class="analysis-point">${trimmedLine}</div>`;
        }

        // Baris biasa
        return `<div class="normal-line">${trimmedLine}</div>`;
    }).join('');

    // RENDER: Gunakan requestAnimationFrame agar browser merender lebih mulus
        requestAnimationFrame(() => {
        resultDiv.innerHTML = formattedHtml;
        
        if (resultContainer.style.display !== 'block') {
            resultContainer.style.display = 'block';
        }

        // Scroll otomatis hanya jika user berada di dekat bawah
        // Agar tidak "memaksa" layar lompat-lompat
        const threshold = 150; 
        const isNearBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - threshold;
        
        if (isNearBottom) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
        }
    });

}

    function copySyarahResult() {
        const content = document.getElementById('syarah-content').innerText;
        navigator.clipboard.writeText(content).then(() => {
            const btn = document.getElementById('btn-copy-syarah');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-check"></i> Tersalin!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        });
    }

    // --- 8. COMMENTS SYSTEM ---
    function checkAdminName() {
        const nameInput = document.getElementById('comment-name');
        const passwordField = document.getElementById('admin-password-field');
        const imageUpload = document.getElementById('admin-image-upload');
        
        if (nameInput.value.toLowerCase() === 'amogenz') {
            passwordField.style.display = 'block';
            imageUpload.style.display = 'block';
        } else {
            passwordField.style.display = 'none';
            imageUpload.style.display = 'none';
            isAdminLoggedIn = false;
        }
    }

    async function sendComment() {
        const name = document.getElementById('comment-name').value.trim();
        const msg = document.getElementById('comment-msg').value.trim();
        const password = document.getElementById('admin-password').value;
        
        if (!name || !msg) {
            alert('Nama dan komentar harus diisi!');
            return;
        }
        
        let isAdmin = false;
        let imageUrl = null;
        
        // Check if admin with hashed password
        if (name.toLowerCase() === 'amogenz') {
            const hashedPassword = await sha256(password);
            if (hashedPassword === ADMIN_PASSWORD_HASH) {
                isAdmin = true;
                if (adminUploadImage) {
                    imageUrl = adminUploadImage;
                }
            } else {
                alert('Password admin salah!');
                return;
            }
        }
        
        const commentData = {
            name: name,
            message: msg,
            timestamp: Date.now(),
            isAdmin: isAdmin,
            imageUrl: imageUrl,
            replies: {}
        };
        
        push(ref(db, 'suggestions'), commentData).then(() => {
            alert('Komentar berhasil dikirim!');
            document.getElementById('comment-name').value = '';
            document.getElementById('comment-msg').value = '';
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-password-field').style.display = 'none';
            document.getElementById('admin-image-upload').style.display = 'none';
            adminUploadImage = null;
            document.getElementById('image-preview-area').style.display = 'none';
        });
    }

    function loadComments() {
        onValue(query(ref(db, 'suggestions'), limitToLast(20)), (snapshot) => {
            const list = document.getElementById('comments-list');
            if (!list) return;
            list.innerHTML = '';
            
            const data = snapshot.val();
            if (data) {
                Object.entries(data).reverse().forEach(([key, item]) => {
                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    
                    let dateStr = "";
                    if (item.timestamp) {
                        dateStr = new Date(item.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit'
                        });
                    }
                    
                    const verifiedBadge = item.isAdmin ? 
                        '<span class="verified-badge"><i class="ph-fill ph-seal-check"></i></span>' : '';
                    
                    const imageHtml = item.imageUrl ? 
                        `<img src="${item.imageUrl}" class="comment-image" alt="Image">` : '';
                    
                    div.innerHTML = `
                        <div class="comment-header">
                            <span class="comment-name">${item.name} ${verifiedBadge}</span>
                            <span class="comment-date">${dateStr}</span>
                        </div>
                        <div class="comment-msg">${item.message}</div>
                        ${imageHtml}
                        <button class="btn-reply" data-comment-id="${key}">
                            <i class="ph ph-arrow-bend-up-left"></i> Balas
                        </button>
                        <div class="replies-container" id="replies-${key}"></div>
                    `;
                    
                    list.appendChild(div);
                    
                    // Load replies
                    if (item.replies) {
                        loadReplies(key, item.replies);
                    }
                });
                
                // Add reply button listeners
                document.querySelectorAll('.btn-reply').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const commentId = e.currentTarget.getAttribute('data-comment-id');
                        showReplyForm(commentId);
                    });
                });
            } else {
                list.innerHTML = '<p style="text-align:center; font-size:14px; opacity:0.5;">Belum ada komentar.</p>';
            }
        });
    }

    function loadReplies(commentId, replies) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (!repliesContainer || !replies) return;
        
        repliesContainer.innerHTML = '';
        Object.entries(replies).forEach(([replyKey, reply]) => {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'reply-item';
            
            let dateStr = "";
            if (reply.timestamp) {
                dateStr = new Date(reply.timestamp).toLocaleDateString('id-ID', {
                    day: 'numeric', 
                    month: 'short',
                    hour: '2-digit', 
                    minute: '2-digit'
                });
            }
            
            const verifiedBadge = reply.isAdmin ? 
                '<span class="verified-badge small"><i class="ph-fill ph-seal-check"></i></span>' : '';
            
            replyDiv.innerHTML = `
                <div class="reply-header">
                    <span class="reply-name">${reply.name} ${verifiedBadge}</span>
                    <span class="reply-date">${dateStr}</span>
                </div>
                <div class="reply-msg">${reply.message}</div>
            `;
            
            repliesContainer.appendChild(replyDiv);
        });
    }

    function showReplyForm(commentId) {
        // Create modal-style reply form
        const replyModal = document.createElement('div');
        replyModal.className = 'reply-modal';
        replyModal.innerHTML = `
            <div class="reply-modal-content">
                <div class="reply-modal-header">
                    <h3>Balas Komentar</h3>
                    <button class="btn-close-modal" id="close-reply-modal">✕</button>
                </div>
                <div class="reply-form-body">
                    <input type="text" id="reply-name" class="glass-field" placeholder="Nama Anda">
                    <textarea id="reply-message" class="glass-field" rows="3" placeholder="Tulis balasan..."></textarea>
                    <button id="btn-send-reply" class="btn-primary" style="width: 100%;">Kirim Balasan</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(replyModal);
        
        // Show modal with animation
        setTimeout(() => replyModal.classList.add('active'), 10);
        
        // Close modal
        document.getElementById('close-reply-modal').onclick = () => {
            replyModal.classList.remove('active');
            setTimeout(() => replyModal.remove(), 300);
        };
        
        // Send reply
        document.getElementById('btn-send-reply').onclick = async () => {
            const name = document.getElementById('reply-name').value.trim();
            const message = document.getElementById('reply-message').value.trim();
            
            if (!name || !message) {
                alert('Nama dan balasan harus diisi!');
                return;
            }
            
            const replyData = {
                name: name,
                message: message,
                timestamp: Date.now(),
                isAdmin: false
            };
            
            push(ref(db, `suggestions/${commentId}/replies`), replyData).then(() => {
                alert('Balasan berhasil dikirim!');
                replyModal.classList.remove('active');
                setTimeout(() => replyModal.remove(), 300);
            });
        };
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        compressImage(file, (base64) => {
            adminUploadImage = base64;
            document.getElementById('image-preview').src = base64;
            document.getElementById('image-preview-area').style.display = 'block';
        });
    }

    function removeImage() {
        adminUploadImage = null;
        document.getElementById('image-preview-area').style.display = 'none';
        document.getElementById('admin-img-file').value = '';
    }

    // --- 9. INIT ---
    function initApp() {
        els = {
            viewStart: document.getElementById('view-start'), 
            viewLoading: document.getElementById('view-loading'), 
            viewQuiz: document.getElementById('view-quiz'),
            ctxSent: document.getElementById('ctx-sentence'), 
            ctxWord: document.getElementById('ctx-word'), 
            badge: document.getElementById('badge-step'), 
            qText: document.getElementById('question-text'), 
            options: document.getElementById('options-container'),
            modal: document.getElementById('modal-feedback'), 
            mCard: document.getElementById('modal-card'), 
            mTitle: document.getElementById('fb-title'), 
            mIcon: document.getElementById('fb-icon'), 
            mMsg: document.getElementById('fb-msg'), 
            mImgArea: document.getElementById('fb-image-area'), 
            mImgSrc: document.getElementById('dawuh-img-src'), 
            mSpinner: document.getElementById('img-spinner'), 
            fbBtn: document.getElementById('fb-btn'),
            soundToggle: document.getElementById('sound-toggle'),
            adminPanel: document.getElementById('admin-panel'), 
            adminLogin: document.getElementById('admin-login'), 
            adminDash: document.getElementById('admin-dash'), 
            adminPass: document.getElementById('admin-pass'),
            marqueeText: document.getElementById('marquee-text'),
            visitorCounter: document.getElementById('visitor-counter')
        };

        // Secret admin access
        document.getElementById('secret-logo').addEventListener('click', handleSecretTap);
        document.getElementById('btn-admin-login').addEventListener('click', handleAdminLogin);
        document.getElementById('btn-close-admin').addEventListener('click', closeAdmin);
        
        // Start button
        document.getElementById('btn-start').addEventListener('click', startLearningCycle);
        
        // Back to home button (from quiz)
        document.getElementById('btn-back-home').addEventListener('click', () => {
            if (confirm('Yakin ingin kembali ke home? Progress quiz akan hilang.')) {
                els.viewQuiz.style.display = 'none';
                els.viewStart.style.display = 'flex';
                quizData = null;
                wordIndex = 0;
                stepIndex = 1;
                quizScore = { correct: 0, wrong: 0, total: 0 };
            }
        });
        
        // Database selection
        document.querySelectorAll('.db-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.db-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentDatabase = e.currentTarget.getAttribute('data-db');
            });
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                switchPage(page);
            });
        });
        
        // Syarah page
        const arabicInput = document.getElementById('arabic-input');
        const charCount = document.getElementById('char-count');
        const btnSyarah = document.getElementById('btn-syarah');
        
        arabicInput.addEventListener('input', (e) => {
            const text = e.target.value;
            const wordCount = countArabicWords(text);
            const charLength = text.length;
            
            charCount.textContent = charLength;
            
            // Enable/disable button based on Arabic content and word count
            if (isArabicText(text) && wordCount > 0 && wordCount <= 7) {
                btnSyarah.disabled = false;
            } else {
                btnSyarah.disabled = true;
            }
            
            // Lock input if exceeds character limit
            if (charLength >= 21) {
                e.target.value = text.substring(0, 21);
            }
        });
        
        btnSyarah.addEventListener('click', analyzeSyarah);
        document.getElementById('btn-copy-syarah').addEventListener('click', copySyarahResult);
        
        // Comments page
        document.getElementById('comment-name').addEventListener('input', checkAdminName);
        document.getElementById('btn-send-comment').addEventListener('click', sendComment);
        document.getElementById('admin-img-file').addEventListener('change', handleImageUpload);
        document.getElementById('btn-remove-image').addEventListener('click', removeImage);
        
        // Marquee animation
        if(els.marqueeText) {
            els.marqueeText.addEventListener('animationiteration', () => {
                dawuhIndex = (dawuhIndex + 1) % DAWUH_PLAYLIST.length;
                els.marqueeText.innerText = DAWUH_PLAYLIST[dawuhIndex];
            });
        }

        // Image loading
        els.mImgSrc.onload = () => { 
            els.mSpinner.style.display = 'none'; 
            els.mImgSrc.style.display = 'block'; 
        };
        els.mImgSrc.onerror = () => { 
            els.mSpinner.style.display = 'none'; 
            els.mImgArea.style.display = 'none'; 
            els.mMsg.innerText = "Gagal memuat gambar."; 
        };

        // Load data
        loadPublicDawuh();
        loadComments();
        initVisitorCounter();
    }

    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', initApp); 
    } else { 
        initApp(); 
    }
