

    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

    import { getDatabase, ref, push, onValue, remove, query, limitToLast, set, get, increment, orderByChild} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

    // loading 
    window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hide');
  }, 0);
});


    // --- 1. CONFIG ---
    const firebaseConfig = { 
      apiKey: "AIzaSyBDyEfe83-_CzRchqcO_lLnuO6Rg9_AF_8", authDomain: "amogenz.firebaseapp.com", databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "amogenz", storageBucket: "amogenz.firebasestorage.app", messagingSenderId: "864003468268", appId: "1:864003468268:web:7c861806529a0dacd66ec9" };
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);
    const googleProvider = new GoogleAuthProvider();


    const sndCorrect = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const sndWrong = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
    sndCorrect.load(); sndWrong.load();

    let wrongSoundTimer = null;
    // FUNGSI KHUSUS UNTUK MEMUTAR AUDIO SALAH
    function mainkanSuaraSalah() {
        if (wrongSoundTimer) {
            clearTimeout(wrongSoundTimer);
        }

        // 2. Paksa stop dan reset ke awal detik 0 secara bersih
        sndWrong.pause();
        sndWrong.currentTime = 0;

        // Kita ubah dari event 'playing' ke play() langsung karena setTimeout di sini jauh lebih stabil
        sndWrong.play().then(() => {
            wrongSoundTimer = setTimeout(() => {
                sndWrong.pause();
                sndWrong.currentTime = 0;
            }, 1300); // <-- Ganti angka milidetik ini buat ngatur durasi (1500ms = 1.5 detik)
        }).catch(err => {
            console.log("Autoplay diblokir browser sebelum ada klik:", err);
        });
    }
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
    let dbCache = {}; // <-- TAMBAHKAN INI BRAY, UNTUK MENAMPUNG DATA DARI GITHUB
    let wordIndex = 0;
    let stepIndex = 1;
    let dawuhImagesCache = [];
    let uploadBase64 = null;
    let tapCount = 0;
    let tapTimer;
    let quizScore = { correct: 0, wrong: 0, total: 0 }; // Track score per session
    let isCurrentStepWrong = false; // <-- Tambahkan ini untuk mengunci skor salah per soal
   
    const SECRET_HASH = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa";
    const ADMIN_PASSWORD_HASH = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa"; // Hash untuk
    let els = {};
    let currentDatabase = 'lv1'; // Default database
    let isAdminLoggedIn = false;
    let adminUploadImage = null;

        // --- MULTIPLIER TINGKAT KESULITAN LEVEL KITAB ---
    const LEVEL_MULTIPLIERS = {
        'lv1': 1,            // Jurumiyah
        'tajwid': 1.5,       // Tajwid
        'shorof': 2,         // Shorof
        'lv2': 3,            // Imrithi
        'alfiyah-isim': 4,   // Alfiyah Isim
        'alfiyah-fiil': 5    // Alfiyah Fi'il
    };

    let isRankMode = false;      // Menandai apakah user sedang main Mode Rank atau Biasa bray
    let currentUserData = null;  // Tempat menyimpan data profil publik user aktif

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

    // --- TWITTER VERIFIED BADGE GENERATOR (INLINE SVG) ---
    function generateTwitterBadgeSVG(fillColor) {
    return `<svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:${fillColor}; display:inline-block; vertical-align:middle; margin-left:4px;"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.356.275C14.77 2.57 13.5 1.5 12 1.5s-2.77 1.07-3.416 2.285c-.415-.175-.876-.275-1.356-.275-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.356-.275C9.23 21.43 10.5 22.5 12 22.5s2.77-1.07 3.416-2.285c.415.175.876.275 1.356.275 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.22 3.518l-3.32-3.32 1.42-1.42 1.9 1.9 4.67-4.67 1.42 1.42-6.09 6.09z"/></svg>`;
}

    // --- LOGIKA UTAMA MONITORING AKUN & PAPAN PERINGKAT ---
    function initLeaderboardRealtimeSync() {
    // 1. Pantau Status Login Secara Live di Latar Belakang
    onAuthStateChanged(auth, (user) => {
        // Ambil elemen DOM
        const rankLoginArea = document.getElementById('rank-login-area');
        const rankSetupArea = document.getElementById('rank-setup-area');
        const rankMainArea = document.getElementById('rank-main-area');
        const userRankName = document.getElementById('user-rank-name');
        const userRankStatus = document.getElementById('user-rank-status');
        const btnBiasa = document.getElementById('btn-mode-biasa');
        const btnRank = document.getElementById('btn-mode-rank');

        if (user) {
            // JIKA USER SUDAH LOGIN GOOGLE
            onValue(ref(db, `users/${user.uid}`), (snapshot) => {
                const data = snapshot.val();
                
                if (data && data.nickname) {
                    currentUserData = data;
                    
                    if (rankLoginArea) rankLoginArea.style.display = 'none';
                    if (rankSetupArea) rankSetupArea.style.display = 'none';
                    if (rankMainArea) rankMainArea.style.display = 'block';
                    if (userRankName) userRankName.innerText = data.nickname;
                    if (userRankStatus) userRankStatus.innerText = `Tabungan: ${(data.total_score || 0).toLocaleString('id-ID')} Poin`;
                    
                    // Cek boks profil pribadi dengan pengecekan bertingkat agar tidak null
                    const settingRow = userRankName ? userRankName.closest('.setting-row') : null;
                    if (settingRow) settingRow.style.display = 'flex';
                } else {
                    if (rankLoginArea) rankLoginArea.style.display = 'none';
                    if (rankSetupArea) rankSetupArea.style.display = 'block';
                    if (rankMainArea) rankMainArea.style.display = 'none';
                }
            });
        } else {
            // JIKA USER BELUM LOGIN
            currentUserData = null;
            isRankMode = false;
            
            // PENGAMAN: Cek tombol sebelum tambah/hapus class
            if (btnBiasa) btnBiasa.classList.add('active');
            if (btnRank) btnRank.classList.remove('active');
            
            if (rankLoginArea) rankLoginArea.style.display = 'block';
            if (rankSetupArea) rankSetupArea.style.display = 'none';
            if (rankMainArea) rankMainArea.style.display = 'block'; 
            
            // PENGAMAN: Sembunyikan boks profil pribadi
            const userRankContainer = document.getElementById('user-rank-name');
            const settingRow = userRankContainer ? userRankContainer.closest('.setting-row') : null;
            if (settingRow) settingRow.style.display = 'none';
        }
    });

    // 2. Tarik Data Klasemen Top 50
    const topRankQuery = query(ref(db, 'users'), orderByChild('total_score'), limitToLast(50));
    onValue(topRankQuery, (snapshot) => {
        const listContainer = document.getElementById('leaderboard-list');
        if (!listContainer) return; // Keluar jika elemen tidak ada
        
        listContainer.innerHTML = '';
        const data = snapshot.val();

        if (data) {
            let usersArr = Object.entries(data).map(([uid, val]) => ({ uid, ...val }));
            usersArr.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

            usersArr.forEach((user, index) => {
                const rankPosition = index + 1;
                let inlineBadgeSvg = '';

                // Logika Lencana
                if (user.is_verified === true) {
                    const warnaKustom = user.verified_color || '#1DA1F2';
                    inlineBadgeSvg = generateTwitterBadgeSVG(warnaKustom);
                } else if (rankPosition <= 3) {
                    inlineBadgeSvg = generateTwitterBadgeSVG('#1DA1F2');
                    if (!user.ever_top_3) set(ref(db, `users/${user.uid}/ever_top_3`), true);
                } else if (user.ever_top_3) {
                    inlineBadgeSvg = generateTwitterBadgeSVG('#C0C0C0');
                }

                const row = document.createElement('div');
                row.className = 'rank-item';
                if (auth.currentUser && user.uid === auth.currentUser.uid) {
                    row.classList.add('my-rank');
                }

                let numClass = '';
                if (rankPosition === 1) numClass = 'top-1';
                else if (rankPosition === 2) numClass = 'top-2';
                else if (rankPosition === 3) numClass = 'top-3';

                row.innerHTML = `
                    <div class="rank-item-left">
                        <span class="rank-number ${numClass}">#${rankPosition}</span>
                        <span class="rank-name-text">${user.nickname} ${inlineBadgeSvg}</span>
                    </div>
                    <span class="rank-points">${(user.total_score || 0).toLocaleString('id-ID')} Poin</span>
                `;
                listContainer.appendChild(row);
            });
        } else {
            listContainer.innerHTML = '<p style="text-align:center; font-size:13px; opacity:0.5; padding:20px 0;">Papan skor masih kosong bray.</p>';
        }
    });
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
    // Fungsi untuk mendapatkan URL mentah dari GitHub via jsDelivr CDN
    function getDbUrl(dbName) {
        const baseUrl = "https://cdn.jsdelivr.net/gh/amogenz/Amogenz/db";
        switch(dbName) {
            case 'lv1':          return `${baseUrl}/amogenzdb-lv1.js`;
            case 'lv2':          return `${baseUrl}/amogenzdb-lv2.js`;
            case 'alfiyah-fiil': return `${baseUrl}/amogenzdb-alfiyah-fiil.js`;
            case 'alfiyah-isim': return `${baseUrl}/amogenzdb-alfiyah-isim.js`;
            case 'shorof':       return `${baseUrl}/amogenzdb-shorof.js`;
            case 'tajwid':       return `${baseUrl}/amogenzdb-tajwid.js`;
            default:             return `${baseUrl}/amogenzdb-alfiyah-fiil.js`;
        }
    }

    // Fungsi cerdas untuk fetch dan parsing file JS berisi export data
    async function loadDatabaseAsync(dbName) {
        // Jika sudah pernah didownload, langsung pakai yang ada di cache
        if (dbCache[dbName]) return dbCache[dbName];

        const url = getDbUrl(dbName);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Gagal mengunduh file database: ${dbName}`);
        
        const text = await response.text();

        // Trik Regex ajaib untuk mengambil isi array/object di dalam export const AMOGENZ_DB_...
        // Mengubah string file JS mentah menjadi objek JSON asli JavaScript
        const match = text.match(/export\s+const\s+AMOGENZ_DB_[A-Z0-9_]+\s*=\s*([\s\S]*?);?\s*$/);
        if (!match) throw new Error(`Format data di dalam file ${dbName} tidak valid.`);

        // Bersihkan dan evaluasi teks menjadi data array
        let rawData = match[1].trim();
        
        // Gunakan Function constructor (aman karena source milik kamu sendiri di GitHub)
        const parsedData = new Function(`return ${rawData}`)();
        
        // Simpan ke cache memory
        dbCache[dbName] = parsedData;
        return parsedData;
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
            // GANTI BAGIAN INI BRAY! Panggil fungsi cerdas kita, jangan sndWrong.play() mentahan lagi
            mainkanSuaraSalah(); 
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
            <button class="tab-btn" id="tab-dev">Dev Sandbox</button>
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

        <div id="form-dev" style="display:none; flex-direction:column; gap:12px;">
            
            <div class="dev-sector">
                <div class="dev-sector-title"><i class="ph ph-eye"></i> Sektor 1: Visual Simulator</div>
                <div class="dev-sector-grid">
                    <button id="btn-sim-score" class="dev-btn-action">✨ Uji Instan Rapor</button>
                    <button id="btn-sim-splash" class="dev-btn-action">🎬 Uji Animasi Splash</button>
                </div>
            </div>
            
            <div class="dev-sector">
                <div class="dev-sector-title"><i class="ph ph-book-open"></i> Sektor 2: Kitab Sandbox (Pilih Lafadz)</div>
                <div style="font-size:11px; opacity:0.6; margin-bottom:6px;">Kitab Aktif: <span id="dev-active-kitab" style="color:var(--ios-blue); font-weight:700;">-</span></div>
                <div id="dev-lafadz-list" class="dev-lafadz-scroll"></div>
            </div>
            
            <div class="dev-sector future-dashed">
                <div class="dev-sector-title" style="opacity:0.4;"><i class="ph ph-plus-circle"></i> Sektor 3: Future Tools</div>
                <p style="font-size:11px; opacity:0.3; text-align:center; padding:5px 0;">Wadah kosong pengujian fitur AI Streaming & log telemetri selanjutnya bray...</p>
            </div>
            
        </div>
        
        <div id="gallery-controls-area">
            <input type="text" id="dawuh-caption" class="glass-field" placeholder="Keterangan (Opsional)" style="margin-top:10px;">
            <button id="btn-save-img" class="btn-primary" style="margin-top: 10px; background: var(--ios-green);">Simpan Gambar</button>
            <h3 style="margin-top: 20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Galeri Dawuh</h3>
            <div id="admin-list" class="suggestion-list" style="margin-top: 10px;"></div>
        </div>
    `; 
    
    const btnUrl = document.getElementById('tab-url'); 
    const btnUpl = document.getElementById('tab-upl'); 
    const btnDev = document.getElementById('tab-dev'); 
    const boxUrl = document.getElementById('form-url'); 
    const boxUpl = document.getElementById('form-upl'); 
    const boxDev = document.getElementById('form-dev'); 
    const galleryCtrls = document.getElementById('gallery-controls-area');
    const inpUrl = document.getElementById('dawuh-url'); 
    let mode = 'url'; 
    
    btnUrl.onclick = () => { 
        mode = 'url'; 
        btnUrl.classList.add('active'); btnUpl.classList.remove('active'); btnDev.classList.remove('active'); 
        boxUrl.style.display = 'block'; boxUpl.style.display = 'none'; boxDev.style.display = 'none';
        galleryCtrls.style.display = 'block';
    }; 
    
    btnUpl.onclick = () => { 
        mode = 'upl'; 
        btnUpl.classList.add('active'); btnUrl.classList.remove('active'); btnDev.classList.remove('active'); 
        boxUpl.style.display = 'block'; boxUrl.style.display = 'none'; boxDev.style.display = 'none';
        galleryCtrls.style.display = 'block';
    }; 

    // EKSEKUSI KLIK TAB DEVELOPER SANDBOX
    btnDev.onclick = async () => {
        mode = 'dev';
        btnDev.classList.add('active'); btnUrl.classList.remove('active'); btnUpl.classList.remove('active'); 
        boxDev.style.display = 'flex'; boxUrl.style.display = 'none'; boxUpl.style.display = 'none';
        galleryCtrls.style.display = 'none'; // Sembunyikan panel galeri dawuh biar fokus nguji kuis bray

        document.getElementById('dev-active-kitab').innerText = currentDatabase.toUpperCase();
        const listContainer = document.getElementById('dev-lafadz-list');
        listContainer.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:11px; padding:10px 0;">Menarik data materi dari GitHub...</p>';
        
        try {
            const DATABASE = await loadDatabaseAsync(currentDatabase);
            listContainer.innerHTML = '';
            
            DATABASE.forEach(quiz => {
                const btnQuiz = document.createElement('div');
                btnQuiz.className = 'suggest-item';
                btnQuiz.style.cssText = "cursor:pointer; text-align:right; direction:rtl; font-family:'Amiri'; font-size:1.1rem; padding:10px; background:rgba(255,255,255,0.05); margin-bottom:2px;";
                btnQuiz.innerText = quiz.teks_kalimat;
                
                btnQuiz.onclick = () => {
                    closeAdmin();
                    startLearningCycle(quiz); // Bypass langsung jalankan lafadz pilihan bray!
                };
                listContainer.appendChild(btnQuiz);
            });
        } catch(e) {
            listContainer.innerHTML = '<p style="text-align:center; color:var(--ios-red); font-size:11px;">Gagal menarik database bray!</p>';
        }
    };
    
    // PEMASANGAN TRIGER BYPASS SEKTOR 1 (VISUAL SIMULATOR)
    document.getElementById('btn-sim-score').onclick = () => {
        closeAdmin();
        tampilkanRaporPremium(7, 8, true); // Pemicu instan boks rapor baru dengan dummy score
    };

    document.getElementById('btn-sim-splash').onclick = () => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            closeAdmin();
            splash.classList.remove('hide');
            setTimeout(() => splash.classList.add('hide'), 1700); // Simulasi ulang splash screen
        }
    };
    
    document.getElementById('file-inp').addEventListener('change', (e) => { 
        if (e.target.files[0]) { 
            compressImage(e.target.files[0], (base64) => { 
                uploadBase64 = base64; 
                const preview = document.getElementById('img-preview'); 
                preview.src = base64; preview.style.display = 'block'; 
            }); 
        } 
    }); 
    
    document.getElementById('btn-save-img').addEventListener('click', () => { 
        const cap = document.getElementById('dawuh-caption').value.trim(); 
        let finalUrl = (mode === 'url') ? inpUrl.value.trim() : uploadBase64; 
        if (!finalUrl) return alert("Gambar belum dipilih!"); 
        push(ref(db, 'dawuh_images'), { url: finalUrl, caption: cap }).then(() => { 
            alert("Gambar Berhasil Disimpan!"); 
            inpUrl.value = ''; document.getElementById('dawuh-caption').value = ''; 
            uploadBase64 = null; document.getElementById('img-preview').style.display = 'none'; 
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
    async function startLearningCycle(forcedQuiz = null) {
    els.viewStart.style.display = 'none';
    els.viewQuiz.style.display = 'none';
    els.viewLoading.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 400));

    try {
        const DATABASE = await loadDatabaseAsync(currentDatabase);
        let selectedQuiz;

        if (forcedQuiz && !(forcedQuiz instanceof Event)) {
            selectedQuiz = forcedQuiz; // Eksekusi jalur pintas mode dev bray
        } else {
            const seenIds = getSeenSentences();
            let availableQuizzes = DATABASE.filter(q => !seenIds.includes(q.id_kalimat));
            if (availableQuizzes.length === 0) availableQuizzes = DATABASE;
            selectedQuiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];
        }

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
        console.error(error);
        alert("Gagal memuat database dari GitHub bray!");
        els.viewLoading.style.display = 'none';
        els.viewStart.style.display = 'flex';
    }
}


    function renderQuestion() {
    isCurrentStepWrong = false; // <-- Reset saklar setiap kali langkah/soal baru dimuat

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

    const currentWordData = quizData.analysis[wordIndex];
    const totalSteps = Object.keys(currentWordData.steps).length;

    if (isCorrect) {
        // Jika benar, langsung akumulasikan ke nilai kuis
        quizScore.total++;
        quizScore.correct++;

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
        // Jika salah, cek dulu apakah ini kesalahan pertama pada soal ini
        if (!isCurrentStepWrong) {
            isCurrentStepWrong = true; // Kunci saklar agar salah berikutnya diabaikan nilainya
            quizScore.total++;
            quizScore.wrong++;
        }

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
    
    // Memunculkan gambar motivasi santri dari galeri dawuh jika ada
    if (dawuhImagesCache.length > 0) {
        const randomIdx = Math.floor(Math.random() * dawuhImagesCache.length);
        const randImg = dawuhImagesCache[randomIdx];
        els.mImgArea.style.display = 'flex'; 
        els.mSpinner.style.display = 'block'; 
        els.mImgSrc.style.display = 'none';
        els.mImgSrc.src = randImg.url; 
        els.mMsg.innerText = randImg.caption || "Tetap Semangat!";
    } else { 
        els.mMsg.innerText = "Alhamdulillah. Lanjut ke kata berikutnya?"; 
    }

    els.modal.style.display = 'flex';
    setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);

    // LOGIKA PERBAIKAN ALUR ALIRAN KUIS BRAY
    els.fbBtn.onclick = () => {
        els.mCard.style.transform = 'scale(0.9)';
        setTimeout(() => {
            els.modal.style.display = 'none'; 
            setTimeout(() => {
                
                // 1. CEK: Apakah masih ada LAFADZ berikutnya di dalam KALIMAT yang sama?
                if (wordIndex < quizData.analysis.length - 1) {
                    wordIndex++;     // Maju ke kata berikutnya
                    stepIndex = 1;   // Reset langkah balik ke STEP 1
                    renderQuestion(); // Muat pertanyaan baru
                } 
                // 2. JIKA TIDAK: Berarti seluruh KALIMAT baru benar-benar selesai tuntas!
                else {
                    wordIndex = 0; 
                    stepIndex = 1; 
                    quizData = null;
                    
                    // BARU DI SINI RAPOR PREMIUM EMAS & SILVER BOLEH DIKELUARKAN!
                    tampilkanRaporPremium(quizScore.correct, quizScore.total, false);
                }
                
            }, 100);
        }, 200);
    };
}


    function tampilkanRaporPremium(correct, total, isSimulation = false) {
    const rank = getRankData(correct, total);
    const wrongCount = total - correct;
        
    // --- LOGIKA PERHITUNGAN & SUNTIK POIN MODE RANK BRAY ---
    let modeRankBadgeHtml = '';
    if (isRankMode && !isSimulation && auth.currentUser) {
        const multiplier = LEVEL_MULTIPLIERS[currentDatabase] || 1;
        const kalkulasiPoin = Math.round(correct * multiplier);
        
        // Buat teks tampilan bonus poin di dalam modal rapor
        modeRankBadgeHtml = `<div style="font-size:0.85rem; color:#FFD700; font-weight:700; margin-top:-8px; margin-bottom:12px;"><i class="ph ph-sparkles"></i> Mode Rank: +${kalkulasiPoin} Poin Klasemen!</div>`;
        
        // Kirim penambahan skor secara mutlak ke awan Firebase menggunakan perintah increment
        set(ref(db, `users/${auth.currentUser.uid}/total_score`), increment(kalkulasiPoin));
    }

    els.mIcon.innerText = rank.icon;
    els.mIcon.style.display = 'block';
    els.mTitle.innerText = isSimulation ? "Simulasi Rapor Dev" : "Alhamdulillah! 🎉";
    els.mTitle.style.color = "#FFD700";
    
    els.mMsg.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size: 1.3rem; font-weight: 800; color: ${rank.color}; letter-spacing: 0.5px; margin-bottom: 2px;">${rank.rank}</div>
            
            ${modeRankBadgeHtml}
            
            <div class="score-board-wrapper" id="score-card-element">
                <div class="score-box-card correct">
                    <div class="score-box-num">${correct}</div>
                    <div class="score-box-label">BENAR</div>
                </div>
                <div class="score-box-card wrong">
                    <div class="score-box-num">${wrongCount}</div>
                    <div class="score-box-label">SALAH</div>
                </div>
                <div class="score-box-card total">
                    <div class="score-box-num">${total}</div>
                    <div class="score-box-label">TOTAL CLICK</div>
                </div>
            </div>
            
            <div style="font-size:0.82rem; color: var(--text-muted); line-height:1.5; margin-bottom: 20px; font-style: italic;">${rank.msg}</div>
            
            <button id="btn-share-score" class="btn-share-premium">
                <i class="ph ph-share-network" style="font-size: 18px;"></i>
                <span id="share-btn-text">Bagikan Gambar Rapor</span>
            </button>
        </div>
    `;


    els.modal.style.display = 'flex';
    setTimeout(() => els.mCard.style.transform = 'scale(1)', 10);
    
    // --- LOGIKA UTAMA KONVERSI HTML TO PNG VIA CANVAS ---
    const btnShare = document.getElementById('btn-share-score');
    const txtShare = document.getElementById('share-btn-text');

    if (btnShare) {
        btnShare.onclick = () => {
            txtShare.innerText = "Memproses Gambar...";
            btnShare.disabled = true;

            // 1. Inisialisasi Kanvas Bayangan Ukuran Resolusi Tinggi (600x520)
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 520;
            const ctx = canvas.getContext('2d');

            // 2. Desain Latar Belakang Kartu (Tema Premium Dark Glass)
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1c1c1e');
            gradient.addColorStop(1, '#0d0d0f');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Frame Perak Halus (Silver Border Line)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 2;
            ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

            // 3. Gambar Emoji Pangkat (Sistem Font Mobile Otomatis)
            ctx.font = '75px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rank.icon, canvas.width / 2, 85);

            // 4. Teks Judul & Gelar Pangkat
            ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(isSimulation ? "SIMULASI RAPOR DEV" : "ALHAMDULILLAH!", canvas.width / 2, 160);

            ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = rank.color || '#ffffff';
            ctx.fillText(rank.rank, canvas.width / 2, 205);

            // 5. Gambar Tiga Boks Nilai (Benar, Salah, Total) Secara Presisi
            const bW = 160; // Lebar boks
            const bH = 95;  // Tinggi boks
            const bY = 260; // Posisi vertikal boks
            const gap = 16; // Jarak antar boks
            const startX = (canvas.width - (bW * 3 + gap * 2)) / 2;

            // Fungsi Pembantu internal untuk melukis boks skor per kategori
            const lukisBoks = (x, value, label, valueColor, labelColor) => {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.fillRect(x, bY, bW, bH);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x, bY, bW, bH);

                // Angka Skor
                ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
                ctx.fillStyle = valueColor;
                ctx.fillText(value, x + bW / 2, bY + bH / 2 - 10);

                // Label Keterangan
                ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
                ctx.fillStyle = labelColor;
                ctx.fillText(label, x + bW / 2, bY + bH / 2 + 25);
            };

            // Jalankan pelukisan 3 boks skor bernuansa perak-putih kustom
            lukisBoks(startX, correct, 'BENAR', '#34C759', 'rgba(52, 199, 89, 0.8)');
            lukisBoks(startX + bW + gap, wrongCount, 'SALAH', '#FF3B30', 'rgba(255, 59, 48, 0.8)');
            lukisBoks(startX + (bW + gap) * 2, total, 'TOTAL CLICK', '#ffffff', 'rgba(255, 255, 255, 0.5)');

            // 6. Tanda Tangan Branding & Tautan Web Resmi di Kerak Bawah Kartu
            ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText('Nahwu OS — Cara Seru Belajar I\'rob', canvas.width / 2, 410);

            ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#007AFF'; // iOS Blue Link Accent
            ctx.fillText('https://nahwu.amogenz.xyz', canvas.width / 2, 440);

            ctx.font = '11px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('Powered by Amogenz.Inc', canvas.width / 2, 470);

            // 7. Proses Output Kanvas Menjadi Berkas Riil PNG Blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert("Gagal memproses gambar bray!");
                    txtShare.innerText = "Bagikan Gambar Rapor";
                    btnShare.disabled = false;
                    return;
                }

                // Bungkus blob menjadi objek File biner siap kirim
                const filePNG = new File([blob], 'rapor-nahwu-os.png', { type: 'image/png' });
                
                // Susun teks caption promosi syiar nahwu beserta URL tujuan
                const captionTeks = `Alhamdulillah! Saya meraih pangkat ${rank.icon} *${rank.rank}* saat belajar kaidah I'rob di Nahwu OS dengan efisiensi klik ${correct}/${total}. Ayo uji pemahaman nahwu shorof pesantrenmu di sini bray! 🦉✨\n\nMain langsung di: https://nahwu.amogenz.xyz`;

                // Cek apakah browser HP mendukung fitur pengiriman berkas gambar langsung
                if (navigator.canShare && navigator.canShare({ files: [filePNG] })) {
                    try {
                        await navigator.share({
                            files: [filePNG],
                            title: 'Pencapaian Rapor Nahwu OS',
                            text: captionTeks
                        });
                    } catch (err) {
                        console.log("Aktivitas share dibatalkan user.");
                    } finally {
                        txtShare.innerText = "Bagikan Gambar Rapor";
                        btnShare.disabled = false;
                    }
                } else {
                    // JALUR CADANGAN (FALLBACK): Unduh Gambar + Salin Teks Otomatis jika sistem operasi lama
                    try {
                        await navigator.clipboard.writeText(captionTeks);
                        
                        const linkDownload = document.createElement('a');
                        linkDownload.href = URL.createObjectURL(blob);
                        linkDownload.download = `rapor_nahwu_os_${correct}_dari_${total}.png`;
                        linkDownload.click();
                        
                        alert("Browser HP-mu belum mendukung share file langsung bray. Tapi tenang, gambar PNG rapor sudah otomatis diunduh ke galeri HP dan teks caption + tautan web sudah disalin ke memori! Kamu tinggal tempel langsung di WA.");
                    } catch (err) {
                        alert("Gagal mengeksekusi sistem pembagian cadangan.");
                    } finally {
                        txtShare.innerText = "Bagikan Gambar Rapor";
                        btnShare.disabled = false;
                    }
                }
            }, 'image/png');
        };
    }

    // Penutup jendela modal kuis
    els.fbBtn.onclick = () => {
        els.mCard.style.transform = 'scale(0.9)'; 
        setTimeout(() => { 
            els.modal.style.display = 'none'; 
            if (!isSimulation) {
                els.viewQuiz.style.display = 'none';
                els.viewStart.style.display = 'flex';
            }
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
    
    // Show selected page (Diberi pengaman bray)
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const navBtn = document.querySelector(`[data-page="${pageName}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
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

        // 1. Tangkap kembalian redirect login Google setelah layar memantul kembali bray
        // getRedirectResult(auth).catch(err => console.error("Redirect Login Error:", err));

        // 2. Trigger Otentikasi Tombol Google Login & Logout di Halaman Peringkat
        document.getElementById('btn-google-login').onclick = () => {
    signInWithPopup(auth, googleProvider)
        .then((result) => {
            console.log("Login sukses bray!", result.user);
        })
        .catch((error) => {
            console.error("Gagal login popup bray:", error);
            alert("Gagal masuk: " + error.message);
        });
};

        document.getElementById('btn-google-logout').onclick = () => { 
            if(confirm("Keluar dari papan kompetisi rank bray?")) signOut(auth); 
        };
        
        // 3. Logika Pendaftaran & Validasi Nickname Unik Publik Pengguna Baru
        document.getElementById('btn-save-nickname').onclick = () => {
            const nickInput = document.getElementById('rank-custom-name').value.trim();
            if (!nickInput || nickInput.length < 3) return alert("Nickname kustom minimal harus 3 karakter bray!");
            
            get(ref(db, 'users')).then((snap) => {
                let isUnique = true;
                if (snap.exists()) {
                    Object.values(snap.val()).forEach(u => {
                        if (u.nickname && u.nickname.toLowerCase() === nickInput.toLowerCase()) isUnique = false;
                    });
                }
                if (!isUnique) {
                    alert("Nama kustom tersebut sudah diambil santri lain bray, silakan cari nama kustom lainnya!");
                } else {
                    // Nama terbukti murni unik, daftarkan koordinat entitas akun baru ke database bray
                    set(ref(db, `users/${auth.currentUser.uid}`), {
                        nickname: nickInput,
                        total_score: 0,
                        ever_top_3: false,
                        created_at: Date.now()
                    });
                }
            });
        };

        // 4. Logika Pengoper Saklar Tombol Pilihan Mode Belajar di Halaman Beranda
        document.getElementById('btn-mode-biasa').onclick = () => {
            isRankMode = false;
            document.getElementById('btn-mode-biasa').classList.add('active');
            document.getElementById('btn-mode-rank').classList.remove('active');
        };
        document.getElementById('btn-mode-rank').onclick = () => {
            if (!auth.currentUser) {
                alert("Kamu wajib login Google dan mengunci nickname kustom terlebih dahulu di Halaman Rank bray!");
                switchPage('rank');
            } else if (!currentUserData || !currentUserData.nickname) {
                alert("Selesaikan setup pembuatan nickname kustom kamu dulu bray agar poin bisa tercatat!");
                switchPage('rank');
            } else {
                isRankMode = true;
                document.getElementById('btn-mode-rank').classList.add('active');
                document.getElementById('btn-mode-biasa').classList.remove('active');
            }
        };


        // Secret admin access
        document.getElementById('secret-logo').addEventListener('click', handleSecretTap);
        document.getElementById('btn-admin-login').addEventListener('click', handleAdminLogin);
        document.getElementById('btn-close-admin').addEventListener('click', closeAdmin);
        
        // Start button - Dibungkus aman agar tidak bocor MouseEvent bray!
        document.getElementById('btn-start').addEventListener('click', () => startLearningCycle());

        
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

        // ==========================================
        // SUB-TAB NAVIGATION SETUP & EXPLORE LAFADZ
        // ==========================================
        const subTabBtns = document.querySelectorAll('.sub-tab-btn');
        const subPageContents = document.querySelectorAll('.sub-page-content');

        subTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                subTabBtns.forEach(b => b.classList.remove('active'));
                subPageContents.forEach(c => c.classList.remove('active'));
                
                e.currentTarget.classList.add('active');
                const targetSub = e.currentTarget.getAttribute('data-sub');
                document.getElementById(`sub-syarah-${targetSub}`).classList.add('active');
                
                if (targetSub === 'explore') {
                    document.getElementById('explore-main-view').style.display = 'block';
                    document.getElementById('explore-detail-view').style.display = 'none';
                }
            });
        });

        // Tombol kembali dari Detail View ke Grid List Utama
        const btnBackExplore = document.getElementById('btn-back-explore');
        if (btnBackExplore) {
            btnBackExplore.onclick = () => {
                document.getElementById('explore-main-view').style.display = 'block';
                document.getElementById('explore-detail-view').style.display = 'none';
            };
        }

        // Tombol salin hasil syarah explore
        const btnCopyExplore = document.getElementById('btn-copy-explore');
        if (btnCopyExplore) {
            btnCopyExplore.onclick = () => {
                const content = document.getElementById('explore-detail-content').innerText;
                navigator.clipboard.writeText(content).then(() => {
                    const originalHTML = btnCopyExplore.innerHTML;
                    btnCopyExplore.innerHTML = '<i class="ph ph-check"></i> Tersalin!';
                    setTimeout(() => { btnCopyExplore.innerHTML = originalHTML; }, 2000);
                });
            };
        }

        // Fungsi Render Detail Syarah Terpilih (Satu Scope Aman dari ReferenceError)
        function showExploreDetail(title, resultRaw) {
            document.getElementById('explore-main-view').style.display = 'none';
            document.getElementById('explore-detail-view').style.display = 'block';
            
            document.getElementById('explore-title-text').textContent = title;
            const detailContentDiv = document.getElementById('explore-detail-content');
            
            // Format teks markdown bawaan dari AI (sama dengan fungsi utama webmu)
            let cleanText = resultRaw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            const lines = cleanText.split('\n');
            
            const formattedHtml = lines.map(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return '<div class="spacer" style="height:10px"></div>'; 

                if (trimmedLine.startsWith('===')) {
                    const label = trimmedLine.replace(/=/g, '').replace('LAFADZ:', '').trim();
                    return `<div class="lafadz-header">📝 LAFADZ: ${label}</div>`;
                }

                if (/^\d+\./.test(trimmedLine)) {
                    return `<div class="analysis-point">${trimmedLine}</div>`;
                }

                return `<div class="normal-line">${trimmedLine}</div>`;
            }).join('');

            requestAnimationFrame(() => {
                detailContentDiv.innerHTML = formattedHtml;
                const contentArea = document.querySelector('#page-syarah .content-area');
                if (contentArea) contentArea.scrollTop = 0;
            });
        }

   // Ambil Data dari Firebase & Render ke Grid List (Urut Waktu Paling Baru di Atas!)
        onValue(ref(db, 'syarah_cache'), (snapshot) => {
            const cacheData = snapshot.val();
            const badge = document.getElementById('cache-total-badge');
            const gridContainer = document.getElementById('explore-grid');
            
            if (!gridContainer) return;
            gridContainer.innerHTML = ''; 
            
            if (cacheData) {
                const items = Object.entries(cacheData);
                if (badge) badge.textContent = items.length;
                
                // --- LOGIKA SORTING AJABIB TERBARU DI SINI BRAY ---
                // Kita urutkan manual berdasarkan property created_at dari yang paling besar (paling baru)
                items.sort((a, b) => {
                    const timeA = a[1].created_at || 0;
                    const timeB = b[1].created_at || 0;
                    return timeB - timeA; // Nilai waktu lebih besar/baru ditaruh di atas
                });
                // -------------------------------------------------
                
                // Sekarang tinggal kita render langsung tanpa perlu .reverse() lagi bray
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
                        <div class="explore-card-arabic">${value.original_input}</div>
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



        // Load data
        loadPublicDawuh();
        loadComments();
        initVisitorCounter();
        initLeaderboardRealtimeSync();
    }

    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', initApp); 
    } else { 
        initApp(); 
    }