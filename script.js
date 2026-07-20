    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

    import { getDatabase, ref, push, onValue, remove, query, limitToLast, set, get, increment, orderByChild, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


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
    let quizScore = { correct: 0, wrong: 0, total: 0 }; 
    let isCurrentStepWrong = false; 
    let els = {};
    let currentDatabase = 'lv1'; 
    let isAdminLoggedIn = false;
    let adminUploadImage = null;
    let currentUserNickname = "";
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


     // 1. Pantau Status Login Secara Live di Latar Belakang
     
    // --- Pantau Status Login Secara Live di Latar Belakang ---
onAuthStateChanged(auth, (user) => {
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
                
                const settingRow = userRankName ? userRankName.closest('.setting-row') : null;
                if (settingRow) settingRow.style.display = 'flex';
            } else {
                if (rankLoginArea) rankLoginArea.style.display = 'none';
                if (rankSetupArea) rankSetupArea.style.display = 'block';
                if (rankMainArea) rankMainArea.style.display = 'none';
            }
        });
    } else {
        // JIKA USER BELUM LOGIN / LOGOUT
        currentUserData = null;
        isRankMode = false;
        
        if (btnBiasa) btnBiasa.classList.add('active');
        if (btnRank) btnRank.classList.remove('active');
        
        if (rankLoginArea) rankLoginArea.style.display = 'block';
        if (rankSetupArea) rankSetupArea.style.display = 'none';
        if (rankMainArea) rankMainArea.style.display = 'block'; 
        
        const userRankContainer = document.getElementById('user-rank-name');
        const settingRow = userRankContainer ? userRankContainer.closest('.setting-row') : null;
        if (settingRow) settingRow.style.display = 'none';
    }

    // 🚨 COK REAKSI INSTAN DI SINI BRAY! JANGAN SALAH TEMPAT LAGI
    if (typeof updatePesanTahtaUI === 'function') {
        updatePesanTahtaUI(window.latestUsersArr || []);
    }

    updateUIAfterLogin(user);
});

      
      function updateUIAfterLogin(user) {

      console.log("Status  user:", user ? "Login" : "Logout");
}

const listContainer = document.getElementById('leaderboard-list');

    function initLeaderboardRealtimeSync() {
    if (window.isLeaderboardSynced) return;
    window.isLeaderboardSynced = true;

    const topRankQuery = query(ref(db, 'users'), orderByChild('total_score'), limitToLast(17));

    onValue(topRankQuery, (snapshot) => {
        const data = snapshot.val();
        if (!listContainer) return; 
        
        listContainer.innerHTML = ''; // Bersihkan container
        
        if (data) {
            let usersArr = Object.entries(data).map(([uid, val]) => ({ uid, ...val }));
            usersArr.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
                    // 🚨 SUNTIKKAN INI BRAY: Biar data klasemen terakhir bisa diintip dari fungsi auth
    window.latestUsersArr = usersArr; 
                usersArr.forEach((user, index) => {
                    const rankPosition = index + 1;
                    let inlineBadgeSvg = '';
                    let autoColor = '#ffffff'; 

                    let rankText = '';
                    let rankIconSvg = '';
                    

                    if (rankPosition === 1) {
                        autoColor = '#FFD700'; // Emas
                        rankText = 'KAISAR';
                        rankIconSvg = `<svg height="21px" width="21px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g transform="translate(1 1)"> <g> <path style="fill:#00DA6C;" d="M425.667,442.842H84.333c-9.387,0-17.067-7.68-17.067-17.067s7.68-17.067,17.067-17.067h341.333 c9.387,0,17.067,7.68,17.067,17.067S435.053,442.842,425.667,442.842"></path> <path style="fill:#00DA6C;" d="M425.667,340.442H84.333c-9.387,0-17.067-7.68-17.067-17.067c0-9.387,7.68-17.067,17.067-17.067 h341.333c9.387,0,17.067,7.68,17.067,17.067C442.733,332.762,435.053,340.442,425.667,340.442"></path> </g> <path style="fill:#FFFFFF;" d="M92.867,323.375c0-9.387,7.68-17.067,17.067-17.067h-25.6c-9.387,0-17.067,7.68-17.067,17.067 c0,9.387,7.68,17.067,17.067,17.067h25.6C100.547,340.442,92.867,332.762,92.867,323.375"></path> <g> <path style="fill:#00AD55;" d="M417.133,323.375c0,9.387-7.68,17.067-17.067,17.067h25.6c9.387,0,17.067-7.68,17.067-17.067 c0-9.387-7.68-17.067-17.067-17.067h-25.6C409.453,306.309,417.133,313.989,417.133,323.375"></path> <path style="fill:#00AD55;" d="M417.133,425.775c0,9.387-7.68,17.067-17.067,17.067h25.6c9.387,0,17.067-7.68,17.067-17.067 s-7.68-17.067-17.067-17.067h-25.6C409.453,408.709,417.133,416.389,417.133,425.775"></path> </g> <path style="fill:#FFFFFF;" d="M92.867,425.775c0-9.387,7.68-17.067,17.067-17.067h-25.6c-9.387,0-17.067,7.68-17.067,17.067 s7.68,17.067,17.067,17.067h25.6C100.547,442.842,92.867,435.162,92.867,425.775"></path> <path style="fill:#00DA6C;" d="M255,220.975L255,220.975c-9.387,0-17.067-7.68-17.067-17.067v-68.267 c0-9.387,7.68-17.067,17.067-17.067s17.067,7.68,17.067,17.067v68.267C272.067,213.295,264.387,220.975,255,220.975"></path> <polygon style="fill:#FFE100;" points="92.867,408.709 417.133,408.709 417.133,340.442 92.867,340.442 "></polygon> <polygon style="fill:#FFA800;" points="391.533,408.709 417.133,408.709 417.133,340.442 391.533,340.442 "></polygon> <polygon style="fill:#FFFFFF;" points="92.867,408.709 118.467,408.709 118.467,340.442 92.867,340.442 "></polygon> <g> <path style="fill:#FFE100;" d="M169.667,179.162L169.667,179.162C70.68,174.895,7.533,67.375,7.533,67.375 s-0.853,163.84,98.133,203.093C115.053,232.922,138.093,199.642,169.667,179.162"></path> <path style="fill:#FFE100;" d="M340.333,178.309L340.333,178.309c31.573,21.333,54.613,54.613,64,92.16 c98.987-39.253,98.133-203.093,98.133-203.093S439.32,174.895,340.333,178.309"></path> </g> <path style="fill:#FFA800;" d="M483.693,94.682c-4.267,44.373-19.627,133.973-81.92,169.813c0.853,2.56,1.707,5.12,1.707,7.68 c99.84-39.253,98.987-203.093,98.987-203.093S495.64,80.175,483.693,94.682"></path> <path style="fill:#FFFFFF;" d="M28.013,92.975c4.267,44.373,19.627,133.973,81.92,169.813c-0.853,2.56-1.707,5.12-1.707,7.68 C8.387,231.215,9.24,67.375,9.24,67.375S16.067,78.469,28.013,92.975"></path> <path style="fill:#FFE100;" d="M272.067,153.562v50.347c0,9.387-7.68,17.067-17.067,17.067s-17.067-7.68-17.067-17.067v-50.347 c-76.8,8.533-136.533,73.387-136.533,152.747h307.2C408.6,226.949,348.867,162.095,272.067,153.562"></path> <path d="M425.667,348.975H84.333c-14.507,0-25.6-11.093-25.6-25.6c0-14.507,11.093-25.6,25.6-25.6h341.333 c14.507,0,25.6,11.093,25.6,25.6C451.267,337.882,440.173,348.975,425.667,348.975z M84.333,314.842 c-5.12,0-8.533,3.413-8.533,8.533c0,5.12,3.413,8.533,8.533,8.533h341.333c5.12,0,8.533-3.413,8.533-8.533 c0-5.12-3.413-8.533-8.533-8.533H84.333z"></path> <path d="M425.667,451.375H84.333c-14.507,0-25.6-11.093-25.6-25.6s11.093-25.6,25.6-25.6h341.333c14.507,0,25.6,11.093,25.6,25.6 S440.173,451.375,425.667,451.375z M84.333,417.242c-5.12,0-8.533,3.413-8.533,8.533s3.413,8.533,8.533,8.533h341.333 c5.12,0,8.533-3.413,8.533-8.533s-3.413-8.533-8.533-8.533H84.333z"></path> <path d="M425.667,417.242H84.333v-85.333h341.333V417.242z M101.4,400.175h307.2v-51.2H101.4V400.175z"></path> <path d="M220.867,383.109H152.6c-5.12,0-8.533-3.413-8.533-8.533s3.413-8.533,8.533-8.533h68.267c5.12,0,8.533,3.413,8.533,8.533 S225.987,383.109,220.867,383.109z"></path> <path d="M357.4,383.109h-68.267c-5.12,0-8.533-3.413-8.533-8.533s3.413-8.533,8.533-8.533H357.4c5.12,0,8.533,3.413,8.533,8.533 S362.52,383.109,357.4,383.109z"></path> <path d="M263.533,374.575c0,5.12-3.413,8.533-8.533,8.533s-8.533-3.413-8.533-8.533s3.413-8.533,8.533-8.533 S263.533,369.455,263.533,374.575"></path> <path d="M400.067,374.575c0,5.12-3.413,8.533-8.533,8.533S383,379.695,383,374.575s3.413-8.533,8.533-8.533 S400.067,369.455,400.067,374.575"></path> <path d="M109.933,374.575c0-5.12,3.413-8.533,8.533-8.533s8.533,3.413,8.533,8.533s-3.413,8.533-8.533,8.533 S109.933,379.695,109.933,374.575"></path> <path d="M105.667,279.002c-0.853,0-1.707,0-3.413-0.853C-1,237.189-1,74.202-1,67.375c0-3.413,2.56-6.827,5.973-8.533 c3.413-0.853,7.68,0.853,9.387,4.267c0.853,0.853,63.147,103.253,155.307,106.667c3.413,0,5.973,1.707,6.827,4.267 s0.853,5.973,0,8.533c-0.853,0.853-1.707,2.56-2.56,2.56c-29.867,20.48-51.2,51.2-59.733,86.187 c-0.853,2.56-2.56,4.267-4.267,5.973C108.227,279.002,107.373,279.002,105.667,279.002z M17.773,97.242 c5.12,45.227,21.333,130.56,81.92,161.28c8.533-29.013,25.6-54.613,47.787-74.24C86.893,173.189,41.667,127.109,17.773,97.242z"></path> <path d="M404.333,279.002c-1.707,0-2.56,0-4.267-0.853c-2.56-0.853-3.413-3.413-4.267-5.973 c-8.533-35.84-29.867-66.56-59.733-86.187c-0.853-0.853-1.707-1.707-2.56-2.56c-1.707-2.56-1.707-5.973-0.853-8.533 c1.707-2.56,4.267-5.12,6.827-5.12c93.013-3.413,155.307-105.813,155.307-106.667c1.707-3.413,5.973-5.12,9.387-4.267 c4.267,1.707,6.827,4.267,6.827,8.533c0,6.827,0,169.813-103.253,210.773C406.04,279.002,405.187,279.002,404.333,279.002z M361.667,184.282c22.187,19.627,39.253,45.227,47.787,74.24c60.587-30.72,77.653-116.053,81.92-161.28 C468.333,127.109,423.107,173.189,361.667,184.282z"></path> <path d="M255,229.509c-14.507,0-25.6-11.093-25.6-25.6v-68.267c0-14.507,11.093-25.6,25.6-25.6c14.507,0,25.6,11.093,25.6,25.6 v68.267C280.6,218.415,269.507,229.509,255,229.509z M255,127.109c-5.12,0-8.533,3.413-8.533,8.533v68.267 c0,5.12,3.413,8.533,8.533,8.533s8.533-3.413,8.533-8.533v-68.267C263.533,130.522,260.12,127.109,255,127.109z"></path> <path d="M408.6,314.842H101.4c-5.12,0-8.533-3.413-8.533-8.533c0-82.773,62.293-151.893,144.213-161.28 c2.56,0,5.12,0.853,6.827,1.707c1.707,1.707,2.56,4.267,2.56,5.973v51.2c0,5.12,3.413,8.533,8.533,8.533 c5.12,0,8.533-3.413,8.533-8.533v-50.347c0-2.56,0.853-5.12,2.56-5.973c1.707-1.707,4.267-2.56,6.827-1.707 c81.92,8.533,144.213,77.653,144.213,160.427C417.133,311.429,413.72,314.842,408.6,314.842z M109.933,297.775h290.133 C395.8,230.362,347.16,174.895,280.6,163.802v40.107c0,14.507-11.093,25.6-25.6,25.6c-14.507,0-25.6-11.093-25.6-25.6v-40.107 C163.693,174.895,114.2,230.362,109.933,297.775z"></path> <path d="M220.867,255.109h-34.133c-5.12,0-8.533-3.413-8.533-8.533s3.413-8.533,8.533-8.533h34.133c5.12,0,8.533,3.413,8.533,8.533 S225.987,255.109,220.867,255.109z"></path> <path d="M144.067,246.575c0-5.12,3.413-8.533,8.533-8.533c5.12,0,8.533,3.413,8.533,8.533s-3.413,8.533-8.533,8.533 C147.48,255.109,144.067,251.695,144.067,246.575"></path> <path d="M331.8,272.175h-34.133c-5.12,0-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533H331.8c5.12,0,8.533,3.413,8.533,8.533C340.333,268.762,336.92,272.175,331.8,272.175z"></path> <path d="M374.467,263.642c0,5.12-3.413,8.533-8.533,8.533s-8.533-3.413-8.533-8.533c0-5.12,3.413-8.533,8.533-8.533 S374.467,258.522,374.467,263.642"></path> </g> </g></svg>`;
                    } else if (rankPosition === 2) {
                        autoColor = '#34C759'; // Hijau Santri
                        rankText = 'PANGLIMA BESAR';
                        rankIconSvg = `<svg height="19px" width="19px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 503.82 503.82" xml:space="preserve" fill="#000000" stroke="#000000" stroke-width="0.0050382000000000005"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g transform="translate(1 1)"> <g> <path style="fill:#ffffff;" d="M400.313,451.62c4.197-4.197,10.072-6.715,16.787-7.554l-57.075-56.236l-23.502,23.502 l57.075,57.075C393.599,462.532,396.117,456.656,400.313,451.62"></path> <path style="fill:#ffffff;" d="M101.507,451.62c-4.197-4.197-10.072-6.715-16.787-7.554l57.075-57.075l23.502,23.502 l-57.075,57.915C108.222,462.532,105.704,456.656,101.507,451.62"></path> </g> <g> <path style="fill:#00ff00;" d="M348.274,398.742C348.274,399.581,348.274,399.581,348.274,398.742 c-14.269,14.269-31.895,23.502-51.2,26.859c-10.911,1.679-20.984-5.875-20.144-16.787l0,0c0-7.554,5.875-14.269,13.43-15.948 c12.59-2.518,24.341-8.393,33.574-17.626c10.072-10.072,15.948-21.823,18.466-35.252c1.679-7.554,8.393-13.43,15.948-13.43l0,0 c10.072,0,18.466,9.233,16.787,19.305C372.615,366.007,362.543,384.473,348.274,398.742"></path> <path style="fill:#00ff00;" d="M436.405,451.62c10.072,10.072,10.072,26.02,0,35.252c-10.072,10.072-26.02,10.072-35.252,0 c-10.072-10.072-10.072-26.02,0-35.252C410.386,441.548,426.333,441.548,436.405,451.62"></path> <path style="fill:#00ff00;" d="M153.546,398.742C153.546,399.581,153.546,399.581,153.546,398.742 c14.269,14.269,31.895,23.502,51.2,26.859c10.911,1.679,20.984-5.875,20.144-16.787l0,0c0-7.554,5.875-14.269,13.43-15.948 c-12.59-2.518-24.341-8.393-33.574-17.626c-10.072-10.072-15.948-21.823-18.466-35.252c-1.679-7.554-8.393-13.43-15.948-13.43l0,0 c-10.072,0-18.466,9.233-16.787,19.305C129.205,366.007,139.277,384.473,153.546,398.742"></path> <path style="fill:#00ff00;" d="M65.415,451.62c-10.072,10.072-10.072,26.02,0,35.252c10.072,10.072,26.02,10.072,35.252,0 c10.072-10.072,10.072-26.02,0-35.252C91.435,441.548,75.487,441.548,65.415,451.62"></path> </g> <g> <path style="fill:#ffffff;" d="M191.317,386.152c-5.036-2.518-10.072-5.875-14.269-10.072s-7.554-8.393-10.072-13.43 l99.043-99.043c83.095-83.095,112.472-160.315,112.472-160.315C438.923,87.345,485.927,7.607,485.927,7.607 s4.197,76.38-25.18,142.689c-4.197,9.233-41.967,8.393-41.967,8.393s10.911,31.056,8.393,33.574 c-5.036,5.875-84.774,89.81-127.58,113.311c-10.072,5.036-20.144,10.911-29.377,17.626 C250.91,335.791,221.533,357.614,191.317,386.152"></path> <path style="fill:#ffffff;" d="M215.658,313.129l35.252-35.252l-15.108-15.108C152.707,179.673,123.33,102.453,123.33,102.453 C62.897,87.345,15.894,7.607,15.894,7.607s-4.197,76.38,25.18,142.689c4.197,9.233,41.967,8.393,41.967,8.393 s-10.911,31.056-8.393,33.574c5.036,5.875,84.774,89.81,127.58,113.311C207.264,308.093,211.461,310.611,215.658,313.129"></path> <path style="fill:#ffffff;" d="M270.215,323.201c-5.875,4.197-11.751,8.393-19.305,13.43c17.626,12.59,38.61,29.377,59.593,49.521 c5.036-2.518,10.072-5.875,14.269-10.072s7.554-8.393,10.072-13.43l-48.682-48.682 C280.287,316.486,275.251,319.843,270.215,323.201"></path> </g> <path d="M293.717,434.834c-5.875,0-11.751-2.518-16.787-5.875c-5.875-5.036-9.233-12.59-8.393-20.144 c0-11.751,9.233-21.823,20.144-23.502c10.911-1.679,20.984-7.554,29.377-15.108c8.393-8.393,14.269-19.305,15.948-31.056 c1.679-11.751,12.59-20.144,24.341-20.144c7.554,0,15.108,3.357,20.144,9.233c5.036,5.875,6.715,13.43,5.875,20.144 c-4.197,21.823-14.269,41.128-30.216,57.075l0,0l0,0c-15.108,15.108-34.413,25.18-55.397,29.377 C297.074,434.834,295.395,434.834,293.717,434.834z M359.186,335.791L359.186,335.791c-4.197,0-7.554,2.518-8.393,6.715 c-2.518,14.269-10.072,28.538-20.984,39.449s-24.341,17.626-38.61,20.144c-3.357,0.839-6.715,4.197-6.715,7.554 s1.679,5.875,2.518,6.715c1.679,1.679,5.036,2.518,7.554,1.679c17.626-3.357,33.574-11.751,46.164-24.341l6.715,5.875l-5.875-5.875 c12.59-12.59,21.823-30.216,25.18-47.843c0.839-3.357-0.839-5.036-1.679-6.715C364.222,336.63,361.704,335.791,359.186,335.791z"></path> <path d="M418.779,502.82c-8.393,0-16.787-3.357-23.502-10.072c-13.43-13.43-13.43-34.413,0-47.843 c13.429-13.43,34.413-13.43,47.843,0c13.429,13.429,13.429,34.413,0,47.843C435.566,499.463,427.172,502.82,418.779,502.82z M418.779,452.46c-4.197,0-8.393,1.679-11.751,5.036c-6.715,6.715-6.715,16.787,0,23.502c6.715,6.715,17.626,6.715,23.502,0 c6.715-6.715,6.715-16.787,0-23.502C427.172,454.138,422.976,452.46,418.779,452.46z"></path> <path d="M393.599,476.801c-2.518,0-4.197-0.839-5.875-2.518l-57.075-57.075c-3.357-3.357-3.357-8.393,0-11.751l23.502-23.502 c3.357-3.357,8.393-3.357,11.751,0l57.075,57.075c2.518,2.518,3.357,5.875,1.679,9.233c-0.839,3.357-4.197,5.036-7.554,5.036 s-7.554,0.839-10.911,5.036c-3.357,3.357-5.036,8.393-5.036,10.911c0,3.357-2.518,5.875-5.036,7.554 C395.277,476.801,394.438,476.801,393.599,476.801z M348.274,411.332l41.128,41.128c1.679-2.518,3.357-5.036,5.036-6.715 c1.679-1.679,4.197-3.357,6.715-5.036l-41.128-41.128L348.274,411.332z"></path> <path d="M208.104,434.834c-1.679,0-3.357,0-5.036-0.839c-20.984-4.197-40.289-14.269-55.397-28.538l-0.839-0.839 c-15.948-15.948-26.02-35.252-30.216-57.075c-1.679-7.554,0.839-14.269,5.875-20.144c5.036-5.875,12.59-9.233,20.144-9.233 c11.751,0,21.823,8.393,24.341,20.144c1.679,10.911,7.554,21.823,15.948,31.056c8.393,8.393,18.466,13.43,29.377,15.108 c11.751,1.679,20.144,11.751,20.144,23.502c0,7.554-3.357,15.108-8.393,20.144C219.854,433.155,213.979,434.834,208.104,434.834z M159.422,393.706c12.59,12.59,28.538,20.984,46.164,24.341c2.518,0.839,5.036,0,7.554-1.679c0.839-0.839,3.357-3.357,2.518-6.715 c0-4.197-2.518-7.554-6.715-7.554c-14.269-2.518-27.698-9.233-38.61-20.144c-10.911-10.911-18.466-25.18-20.984-39.449 c-0.839-3.357-4.197-6.715-7.554-6.715c-2.518,0-5.036,0.839-6.715,3.357c-0.839,0.839-2.518,3.357-1.679,6.715 C137.599,362.65,145.992,380.276,159.422,393.706C159.422,392.866,159.422,392.866,159.422,393.706l-6.715,5.875L159.422,393.706z"></path> <path d="M83.041,502.82c-8.393,0-16.787-3.357-23.502-10.072c-13.43-13.43-13.43-34.413,0-47.843l0,0 c13.43-13.43,34.413-13.43,47.843,0c13.43,13.429,13.43,34.413,0,47.843C100.668,499.463,92.274,502.82,83.041,502.82z M71.291,457.496c-6.715,6.715-6.715,16.787,0,23.502c6.715,6.715,16.787,6.715,23.502,0c6.715-6.715,6.715-16.787,0-23.502 C88.917,450.781,78.005,450.781,71.291,457.496L71.291,457.496z"></path> <path d="M191.317,394.545c-1.679,0-2.518,0-4.197-0.839c-5.875-3.357-10.911-7.554-15.948-11.751 c-4.197-4.197-8.393-9.233-11.751-15.108c-1.679-3.357-1.679-7.554,0.839-10.072l99.043-99.043c82.256-82.256,111.633-157.797,111.633-157.797c0.839-2.518,3.357-4.197,5.875-5.036C433.048,79.791,478.372,4.25,478.372,3.411 c1.679-3.357,5.875-5.036,9.233-4.197c4.197,0.839,6.715,4.197,6.715,7.554s4.197,78.898-26.02,146.885 c-3.357,7.554-15.948,12.59-37.771,13.43c8.393,25.18,5.875,27.698,3.357,31.056c-5.036,5.875-84.774,90.649-130.098,115.83 c-8.393,5.036-19.305,10.072-28.538,16.787c-19.305,13.43-48.682,34.413-78.059,62.111 C195.513,393.706,192.995,394.545,191.317,394.545z M177.887,363.489c1.679,2.518,3.357,4.197,5.875,6.715 c1.679,1.679,4.197,4.197,6.715,5.875c28.538-26.02,56.236-46.164,75.541-59.593c10.072-6.715,20.984-12.59,30.216-17.626 c38.61-20.984,110.793-95.685,123.384-109.954c-0.839-5.036-4.197-17.626-8.393-27.698c-0.839-2.518-0.839-5.036,0.839-7.554 c1.679-2.518,4.197-3.357,6.715-3.357c14.269,0,31.056-1.679,34.413-4.197c17.626-39.449,22.662-83.934,23.502-110.793 c-18.466,25.18-52.039,62.111-92.328,74.702c-7.554,16.787-38.61,84.774-113.311,159.475L177.887,363.489z M420.458,187.227 L420.458,187.227L420.458,187.227z"></path> <path d="M108.222,476.801c-0.839,0-1.679,0-3.357-0.839c-3.357-0.839-5.036-4.197-5.036-7.554s-0.839-7.554-5.036-10.911l0,0 c-3.357-3.357-8.393-5.036-10.911-5.036c-3.357,0-5.875-2.518-7.554-5.036c-0.839-3.357-0.839-6.715,1.679-9.233l57.075-57.075 c3.357-3.357,8.393-3.357,11.751,0l23.502,23.502c3.357,3.357,3.357,8.393,0,11.751l-57.075,57.075 C112.418,475.961,110.74,476.801,108.222,476.801z M107.382,445.745c1.679,1.679,3.357,4.197,5.036,6.715l41.128-41.128 l-11.751-11.751l-41.128,41.128C103.186,442.388,104.864,444.066,107.382,445.745L107.382,445.745z"></path> <path d="M215.658,321.522c-1.679,0-2.518,0-4.197-0.839c-4.197-2.518-8.393-5.036-13.43-7.554 C152.707,288.788,72.13,203.175,67.933,197.299c-2.518-2.518-4.197-5.036,3.357-30.216c-21.823-0.839-34.413-5.036-37.77-13.43 C3.304,86.506,7.5,10.125,7.5,6.768s2.518-6.715,6.715-7.554c3.357-0.839,7.554,0.839,9.233,4.197 c0,0.839,45.325,76.38,101.561,90.649c2.518,0.839,5.036,2.518,5.875,5.036c0,0.839,30.216,76.38,110.793,156.957l15.108,15.108 c1.679,1.679,2.518,3.357,2.518,5.875s-0.839,4.197-2.518,5.875l-35.252,35.252C219.854,320.683,218.176,321.522,215.658,321.522z M83.041,188.906c12.59,14.269,84.774,88.131,123.384,109.954c2.518,1.679,5.036,3.357,8.393,4.197l24.341-24.341l-9.233-9.233 c-73.862-73.862-105.757-141.849-113.311-159.475c-40.289-12.59-73.862-50.361-92.328-74.702 c1.679,27.698,6.715,71.344,23.502,110.793c4.197,2.518,20.144,4.197,35.252,4.197c2.518,0,5.036,1.679,6.715,3.357 c1.679,2.518,1.679,5.036,0.839,7.554C87.238,171.279,83.881,183.87,83.041,188.906z M81.363,187.227L81.363,187.227 L81.363,187.227z"></path> <path d="M310.504,394.545c-1.679,0-4.197-0.839-5.875-2.518c-17.626-16.787-37.771-32.734-58.754-48.682 c-2.518-1.679-3.357-4.197-3.357-6.715s1.679-5.036,3.357-6.715c7.554-5.036,14.269-10.072,19.305-14.269 c5.036-3.357,10.072-6.715,15.948-10.072c3.357-1.679,7.554-1.679,10.072,1.679l48.682,48.682 c2.518,2.518,3.357,6.715,1.679,10.072c-3.357,5.875-7.554,10.911-11.751,15.108c-4.197,4.197-10.072,8.393-15.948,11.751 C313.861,393.706,312.182,394.545,310.504,394.545z M265.179,336.63c16.787,12.59,31.895,25.18,46.164,38.61 c2.518-1.679,5.036-3.357,6.715-5.875c1.679-1.679,3.357-4.197,5.036-6.715l-38.61-38.61c-3.357,2.518-6.715,4.197-10.072,5.875 l0,0C271.894,332.434,268.536,334.112,265.179,336.63z M270.215,323.201L270.215,323.201L270.215,323.201z"></path> </g> </g></svg>`;
                    } else if (rankPosition === 3) {
                        autoColor = '#007AFF'; // Biru Premium
                        rankText = 'JENDRAL';
                        rankIconSvg = `<svg height="17px" width="17px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 511.147 511.147" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g transform="translate(1 1)"> <path style="fill:#ffffff;" d="M450.84,177.347V57.88c-11.093-12.8-45.227-24.747-82.773-34.987 c-74.24-19.627-152.747-19.627-226.987,0C103.534,33.133,69.4,45.08,58.307,57.88v119.467c0,0-3.413,237.227,196.267,324.267 C454.254,414.573,450.84,177.347,450.84,177.347"></path> <path style="fill:#FFA800;" d="M451.694,177.347V57.88c-11.093-12.8-45.227-24.747-82.773-34.987 c-31.573-8.533-64-12.8-95.573-14.507c26.453,1.707,52.907,6.827,78.507,13.653c37.547,10.24,72.533,22.187,82.773,34.987v119.467 c0,0,3.413,230.4-188.587,320.853c3.413,1.707,5.973,3.413,9.387,4.267C455.107,414.573,451.694,177.347,451.694,177.347"></path> <path style="fill:#FFFFFF;" d="M58.307,177.347V57.88c11.093-12.8,45.227-24.747,82.773-34.987c31.573-8.533,64-12.8,95.573-14.507c-26.453,1.707-52.907,6.827-78.507,13.653c-37.547,9.387-71.68,22.187-82.773,34.987v119.467c0,0-3.413,230.4,188.587,320.853c-3.413,1.707-5.973,3.413-9.387,4.267C54.894,414.573,58.307,177.347,58.307,177.347"></path> <path style="fill:#ffffff;" d="M254.574,454.68c-153.6-80.213-153.6-268.8-153.6-276.48V80.92 c9.387-4.267,24.747-10.24,51.2-17.067c33.28-9.387,67.413-13.653,102.4-13.653s69.12,4.267,102.4,13.653 c26.453,6.827,41.813,12.8,51.2,17.067v96.427C408.174,185.88,408.174,374.467,254.574,454.68"></path> <path style="fill:#63D3FD;" d="M237.507,245.613c0,44.373-24.747,75.093-24.747,75.093l23.04-4.267l18.773,23.04l18.773-23.04 l23.04,4.267c0,0-24.747-30.72-24.747-75.093c44.373,0,75.093,24.747,75.093,24.747l-4.267-23.04l23.04-18.773l-23.04-18.773 l4.267-23.04c0,0-30.72,24.747-75.093,24.747c0-44.373,24.747-75.093,24.747-75.093l-23.04,4.267l-18.773-23.04l-18.773,23.04 l-23.04-4.267c0,0,24.747,30.72,24.747,75.093c-44.373,0-75.093-24.747-75.093-24.747l4.267,23.04l-23.04,18.773l23.04,18.773 l-4.267,23.04C162.414,270.36,193.134,245.613,237.507,245.613"></path> <path d="M254.574,348.013c-2.56,0-5.12-0.853-6.827-3.413l-15.36-18.773l-17.92,3.413c-3.413,0.853-6.827-0.853-8.533-4.267 c-1.707-3.413-1.707-6.827,0.853-9.387c0,0,19.627-24.747,22.187-61.44c-35.84,2.56-60.587,22.187-61.44,22.187 c-2.56,2.56-6.827,2.56-9.387,0.853c-2.56-1.707-4.267-5.12-4.267-8.533l3.413-17.92l-18.773-15.36 c-2.56-1.707-3.413-4.267-3.413-6.827s0.853-5.12,3.413-6.827l18.773-15.36l-3.413-17.92c-0.853-3.413,0.853-6.827,4.267-8.533 c3.413-1.707,6.827-1.707,9.387,0.853c0,0,24.747,19.627,61.44,22.187c-2.56-35.84-22.187-60.587-22.187-61.44 c-2.56-2.56-2.56-6.827-0.853-9.387c1.707-3.413,5.12-4.267,8.533-4.267l17.92,3.413l15.36-18.773 c3.413-4.267,10.24-4.267,13.653,0l15.36,18.773l17.92-3.413c3.413-0.853,6.827,0.853,8.533,4.267 c1.707,3.413,1.707,6.827-0.853,9.387c0,0-19.627,24.747-22.187,61.44c35.84-2.56,60.587-22.187,61.44-22.187 c2.56-2.56,6.827-2.56,9.387-0.853c3.413,1.707,4.267,5.12,4.267,8.533l-3.413,17.92l18.773,15.36 c1.707,1.707,3.413,4.267,3.413,6.827s-0.853,5.12-3.413,6.827l-18.773,15.36l3.413,17.92c0.853,3.413-0.853,6.827-4.267,8.533 s-6.827,1.707-9.387-0.853c0,0-24.747-19.627-61.44-22.187c2.56,35.84,22.187,60.587,22.187,61.44 c2.56,2.56,2.56,6.827,0.853,9.387c-1.707,3.413-5.12,4.267-8.533,4.267l-17.92-3.413L261.4,344.6 C259.694,347.16,257.134,348.013,254.574,348.013z M235.8,307.907c2.56,0,5.12,0.853,6.827,3.413l11.947,14.507l11.947-14.507 c1.707-2.56,5.12-3.413,8.533-3.413l4.267,0.853c-7.68-14.507-16.213-36.693-16.213-63.147c0-5.12,3.413-8.533,8.533-8.533 c26.453,0,48.64,8.533,63.147,15.36l-0.853-4.267c-0.853-3.413,0.853-5.973,3.413-8.533l14.507-11.947l-14.507-11.947 c-2.56-1.707-3.413-5.12-3.413-8.533l0.853-4.267c-14.507,8.533-36.693,17.067-63.147,17.067c-5.12,0-8.533-3.413-8.533-8.533 c0-26.453,8.533-48.64,15.36-63.147l-4.267,0.853c-3.413,0.853-5.973-0.853-8.533-3.413l-11.093-14.507l-11.947,14.507 c-1.707,2.56-5.12,3.413-8.533,3.413l-4.267-0.853c7.68,14.507,16.213,36.693,16.213,63.147c0,5.12-3.413,8.533-8.533,8.533 c-26.453,0-48.64-8.533-63.147-15.36l0.853,4.267c0.853,3.413-0.853,5.973-3.413,8.533l-14.507,11.093l14.507,11.947 c2.56,1.707,3.413,5.12,3.413,8.533l-0.853,4.267c14.507-7.68,36.693-16.213,63.147-16.213c5.12,0,8.533,3.413,8.533,8.533 c0,26.453-8.533,48.64-15.36,63.147l4.267-0.853C234.947,307.907,235.8,307.907,235.8,307.907z"></path> <path d="M254.574,510.147c-0.853,0-2.56,0-3.413-0.853C48.067,420.547,49.774,179.907,49.774,177.347V57.88 c0-1.707,0.853-4.267,1.707-5.12c11.093-12.8,39.253-25.6,87.893-38.4c75.947-20.48,155.307-20.48,231.253,0 c47.787,12.8,76.8,25.6,87.04,37.547c0.853,1.707,1.707,4.267,1.707,5.973v119.467c0,5.973,0,244.053-201.387,331.947 C257.134,510.147,255.427,510.147,254.574,510.147z M66.84,61.293v116.053c0,2.56-0.853,229.547,187.733,314.88 c188.587-85.333,187.733-312.32,187.733-314.88l0,0V61.293c-6.827-5.973-25.6-16.213-76.8-30.72 c-72.533-19.627-149.333-19.627-221.867,0C92.44,45.08,73.667,55.32,66.84,61.293z"></path> <path d="M254.574,463.213c-1.707,0-2.56,0-4.267-0.853C92.44,379.587,92.44,185.88,92.44,178.2V80.92 c0-3.413,1.707-6.827,5.12-7.68c12.8-5.12,30.72-11.093,52.907-17.067c68.267-18.773,140.8-18.773,209.067,0 C381.72,62.147,399.64,68.12,412.44,73.24c2.56,0.853,4.267,4.267,4.267,7.68v96.427c0,8.533,0,202.24-157.867,284.16 C257.134,462.36,256.28,463.213,254.574,463.213z M109.507,86.893V178.2c0,7.68,0,187.733,145.067,267.093 C399.64,365.933,399.64,185.027,399.64,177.347V86.893c-8.533-3.413-23.04-8.533-45.227-14.507 c-64.853-17.92-134.827-17.92-199.68,0C132.547,78.36,118.04,82.627,109.507,86.893z"></path> </g> </g></svg>`;
                    }

                    // --- LOGIKA PENENTUAN BADGE CENTANG VERIFIED ---
                    if (user.is_verified === true) {
                        const warnaKustom = user.verified_color || '#1DA1F2';
                        inlineBadgeSvg = generateTwitterBadgeSVG(warnaKustom);
                    } 
                    else if (rankPosition <= 3) {
    inlineBadgeSvg = generateTwitterBadgeSVG(autoColor);
    
    // 🚨 FIX: Cek dulu apakah dia lagi login dan apakah statusnya emang belum true
    if (auth.currentUser && auth.currentUser.uid === user.uid && user.ever_top_3 !== true) {
        set(ref(db, `users/${user.uid}/ever_top_3`), true)
            .catch(err => console.log("Gak bisa tulis ke DB, wajar kalau bukan akun sendiri bray"));
    }
}
                    else if (user.ever_top_3) {
                        inlineBadgeSvg = generateTwitterBadgeSVG('#C0C0C0');
                    }
                    
                    // Ganti bagian pesanTahtaHtml lu jadi ini, lebih aman:
const statusMsg = user.status_message || ""; // Default ke string kosong jika null/undefined
const pesanTahtaHtml = (rankPosition <= 2 && statusMsg.length > 0) 
    ? `<div style="font-family: 'BerlinSansFB'; font-size:0.75rem; color:#fff; opacity:0.7; margin-top:4px; font-style:italic;">"${statusMsg}"</div>` 
    : '';


                    const row = document.createElement('div');
                    row.className = 'rank-item';
                    if (auth.currentUser && user.uid === auth.currentUser.uid) {
                        row.classList.add('my-rank');
                    }

                    // --- RENDER LAYOUT KLASEMEN (POSISI PRESISI DENGAN FONT BERLIN) ---
                    if (rankPosition <= 3) {
                        row.innerHTML = `
                            <div class="rank-item-left" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 4px 0 4px 2px;">
                                <span style="font-family: 'BerlinSansFB', 'BerlinSansFB', BerlinSansFB; font-size: 0.65rem; color: ${autoColor}; font-weight: 700; letter-spacing: 0.8px; opacity: 0.9;">
                                    ${rankText}
                                </span>
                                <span class="rank-name-text" style="font-family: 'BerlinSansFB', 'BerlinSansFB', BerlinSansFB; color: #ffffff; font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 6px;">
                                    ${rankIconSvg} ${user.nickname} ${inlineBadgeSvg}
                                </span>
                                ${pesanTahtaHtml} 
                            </div>
                            <span class="rank-points" style="font-family: 'BerlinSansFB', 'BerlinSansFB', BerlinSansFB; color: ${autoColor}; font-weight: 700; font-size: 0.95rem;">
                                ${(user.total_score || 0).toLocaleString('id-ID')} Poin
                            </span>
                        `;
                    } else {
                        row.innerHTML = `
                            <div class="rank-item-left" style="display: flex; align-items: center; gap: 12px;">
                                <span class="rank-number">#${rankPosition}</span>
                                <span class="rank-name-text" style="font-size: 0.9rem;">${user.nickname} ${inlineBadgeSvg}</span>
                            </div>
                            <span class="rank-points" style="font-size: 0.85rem; opacity: 0.8;">
                                ${(user.total_score || 0).toLocaleString('id-ID')} Poin
                            </span>
                        `;
                    }
                    listContainer.appendChild(row);
                });
updatePesanTahtaUI(usersArr);
            } else {
                listContainer.innerHTML = '<p style="text-align:center; font-size:13px; opacity:0.5; padding:20px 0;">Papan skor masih kosong bray.</p>';
            }

        
        
        });
            // 3. Trigger Simpan Pesan Tahta
    document.getElementById('btn-save-pesan').onclick = () => {
        const msg = document.getElementById('input-pesan-tahta').value;
        if (auth.currentUser) {
            set(ref(db, `users/${auth.currentUser.uid}/status_message`), msg)
                .then(() => alert("Pesan Tahta diperbarui bray!"))
                .catch(err => alert("Gagal: " + err.message));
        }
    };
    }
  
    function updatePesanTahtaUI(usersArr) {
    const inputPesan = document.getElementById('input-pesan-tahta');
    const btnSave = document.getElementById('btn-save-pesan');
    const infoText = document.getElementById('status-info-text');

    if (!inputPesan || !btnSave || !infoText) return;

    // 🔒 JIKA USER LOGOUT / BELUM LOGIN (Langsung Kunci Total)
    if (!auth.currentUser) {
        inputPesan.disabled = true;
        btnSave.disabled = true;
        inputPesan.value = ""; // Bersihkan sisa ketikan mantan user sebelumnya bray
        infoText.innerText = " PESAN KHUSUS RANK 1 & 2";
        return;
    }

    // Jika data klasemen dari Firebase belum siap, biarkan terkunci dulu sementara
    if (!usersArr || usersArr.length === 0) return;

    const myRankIndex = usersArr.findIndex(u => u.uid === auth.currentUser.uid);

    // 🔓 JIKA USER MASUK CATEGORY TOP 2 (Rank 1 indeks 0, Rank 2 indeks 1)
    if (myRankIndex !== -1 && myRankIndex <= 1) {
        inputPesan.disabled = false;
        btnSave.disabled = false;
        infoText.innerText = " KAMU ADALAH PENGAWAS TAHTA";
        
        // Hanya isi jika kolom kosong agar tidak merusak ketikan baru yang sedang ditulis user
        if (inputPesan.value === "") {
             inputPesan.value = usersArr[myRankIndex].status_message || "";
        }
    } else {
        // 🔒 JIKA LOGGED IN TAPI BUKAN TOP 2 (Kunci & Tendang)
        inputPesan.disabled = true;
        btnSave.disabled = true;
        inputPesan.value = ""; // Bersihkan kolom
        infoText.innerText = " PESAN KHUSUS RANK 1 & 2";
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
    
    // --- CARI & GANTI FUNGSI handleAdminLogin DI script.js ---
    async function handleAdminLogin() { 
    const inputPass = els.adminPass.value.trim();
    
    if (!inputPass) {
        return alert("Sandi tidak boleh kosong bray!");
    }

    try {
        const res = await fetch('/api/admin-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: inputPass })
        });

        const data = await res.json();

        if (data.success) {
            unlockAdminPanel(); // Buka panel admin jika sukses
        } else {
            alert(data.message || "Sandi Salah!");
        }
    } catch (err) {
        console.error("Gagal terhubung ke verifikasi admin:", err);
        alert("Gagal melakukan verifikasi admin.");
    }
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
    
    document.getElementById('btn-save-img').addEventListener('click', async () => { 
    const cap = document.getElementById('dawuh-caption').value.trim(); 
    let finalUrl = (mode === 'url') ? inpUrl.value.trim() : uploadBase64; 
    
    if (!finalUrl) return alert("Gambar belum dipilih!"); 

    try {
        const response = await fetch('/api/dawuh-manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add',
                password: els.adminPass.value,
                url: finalUrl,
                caption: cap
            })
        });

        const data = await response.json();
        
        if (data.success) {
            alert(data.message); 
            inpUrl.value = ''; 
            document.getElementById('dawuh-caption').value = ''; 
            uploadBase64 = null; 
            document.getElementById('img-preview').style.display = 'none'; 
        } else {
            alert("Gagal: " + data.message);
        }
    } catch (err) {
        console.error("Gagal simpan gambar:", err);
        alert("Terjadi kesalahan koneksi server!");
    }
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
                    delBtn.onclick = async () => { 
    if (confirm("Yakin mau hapus gambar ini?")) {
        try {
            const response = await fetch('/api/dawuh-manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    password: els.adminPass.value,
                    key: key
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(data.message);
            } else {
                alert("Gagal menghapus: " + data.message);
            }
        } catch (err) {
            console.error("Gagal hapus gambar:", err);
            alert("Terjadi kesalahan koneksi server!");
        }
    }
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
    // --- CARI & GANTI BAGIAN INI DI script.js ---
if (isRankMode && !isSimulation && auth.currentUser) {
    const multiplier = LEVEL_MULTIPLIERS[currentDatabase] || 1;
    let kalkulasiPoin = Math.round(correct * multiplier);
    const skorAmanYangDikirim = Math.min(kalkulasiPoin, 3);
    
    modeRankBadgeHtml = `<div style="font-size:0.85rem; color:#FFD700; font-weight:700; margin-top:-8px; margin-bottom:12px;"><i class="ph ph-sparkles"></i> Mode Rank: +${skorAmanYangDikirim} Poin Klasemen!</div>`;
    
    // 🚨 PEMANGGILAN API SERVERLESS VERCEL
    fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            uid: auth.currentUser.uid,
            correct: correct,
            dbName: currentDatabase
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log("⚡ Skor diverifikasi & disimpan oleh Vercel Serverless:", data.message);
        } else {
            console.error("🚨 Gagal simpan skor:", data.message);
        }
    })
    .catch(err => {
        console.error("🚨 Network error serverless:", err);
    });
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
               // 🚨 SEKARANG AMAN: Hanya mencari tombol balas yang berada di dalam KOTAK KOMENTAR SAJA 
               document.querySelectorAll('#comments-list .btn-reply').forEach(btn => {
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
      document.getElementById('btn-back-home')?.addEventListener('click', () => {
    if (confirm('Yakin ingin kembali ke home? Progress quiz akan hilang.')) {
        els.viewQuiz.style.display = 'none';
        els.viewStart.style.display = 'flex';
        
        // Reset state kuis biasa & kuis komunitas
        quizData = null;
        currentCommunityQuiz = null;
        currentCommunityIdx = 0;
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
        // GANTI MENJADI SEPERTI INI AGAR BERIKATAN KHUSUS DI HALAMAN SYARAH SAJA:
const subTabBtns = document.querySelectorAll('#page-syarah .sub-tab-btn');
const subPageContents = document.querySelectorAll('#page-syarah .sub-page-content');

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

      // SELIPKAN INI DI DALAM initApp() BRAY:
const btnInfoRank = document.getElementById('btn-info-rank');
const infoRankBox = document.getElementById('info-rank-box');

if (btnInfoRank) {
    btnInfoRank.addEventListener('click', (e) => {
        e.stopPropagation(); // Kunci jalur biar gak memicu event lain bray
        if (infoRankBox) {
            infoRankBox.style.display = (infoRankBox.style.display === 'none' || infoRankBox.style.display === '') ? 'block' : 'none';
        }
    });
}




        // Load data
        loadPublicDawuh();
        loadComments();
        initVisitorCounter();
        initLeaderboardRealtimeSync();
        initCommunityQuizzesSync();
    }

    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', initApp); 
    } else { 
        initApp(); 
    }
// ==========================================
// 🏟️ LOGIKA ARENA SANTRI & KUIS KOMUNITAS
// ==========================================

// 1. PINDAH SUB-TAB ARENA (Jelajah Kuis VS Studio)
document.querySelectorAll('[data-sub-arena]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetSub = e.currentTarget.getAttribute('data-sub-arena');
        
        // Ubah status tombol active
        document.querySelectorAll('[data-sub-arena]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Sembunyikan semua sub-page arena lalu tampilkan yang dipilih
        document.querySelectorAll('.sub-page-arena').forEach(sp => sp.style.display = 'none');
        const targetElem = document.getElementById(`sub-arena-${targetSub}`);
        if (targetElem) targetElem.style.display = 'block';
    });
});

// 2. TARIK DATA KUIS KOMUNITAS SECARA REALTIME DARI FIREBASE

function initCommunityQuizzesSync() {
    const quizGrid = document.getElementById('community-quiz-grid');
    if (!quizGrid) return;

    onValue(ref(db, 'community_quizzes'), (snapshot) => {
        const data = snapshot.val();
        quizGrid.innerHTML = ''; // Bersihkan grid sebelum render ulang

        if (data) {
            const quizzes = Object.values(data);
            
            // Urutkan kuis dari yang terbaru
            quizzes.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

            quizzes.forEach(quiz => {
                const card = document.createElement('div');
                card.className = 'explore-item-card';
                card.style.position = 'relative';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width:100%; margin-bottom: 6px;">
                        <span style="font-size: 0.7rem; color: var(--ios-green); font-weight: 700;">● ${(quiz.category || 'UMUM').toUpperCase()}</span>
                        <span style="font-size: 0.7rem; opacity: 0.6;"><i class="ph ph-play-circle"></i> ${quiz.plays_count || 0}x dimainkan</span>
                    </div>
                    <div class="explore-card-arabic" style="font-size: 1.2rem;">${quiz.questions?.[0]?.word || quiz.title}</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #fff; margin-top: 4px;">${quiz.title}</div>
                    <div class="explore-card-meta" style="margin-top: 8px;">
                        <span><i class="ph ph-user"></i> ${quiz.author_name || 'Santri Anonim'}</span>
                    </div>
                `;

                // 🛡️ Cegah klik ganda (stop propagation)
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

// ==========================================
// 🛠️ MANAJER STUDIO KUIS DINAMIS (1 - 14 SOAL)
// ==========================================

let studioQuestionCount = 0;
const MAX_QUESTIONS = 14;

// 1. Fungsi Render Templat Blok Soal
function createQuestionBlockHTML(index) {
    const isFirst = (index === 1);
    return `
        <div class="q-block-item" data-q-index="${index}" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--ios-blue);">📌 Soal #${index}</span>
                ${!isFirst ? `<button type="button" class="btn-remove-q" onclick="removeStudioQuestionBlock(${index})" style="background: rgba(255,59,48,0.2); border: 1px solid rgba(255,59,48,0.4); color: #FF3B30; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer;"><i class="ph ph-trash"></i> Hapus</button>` : ''}
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

// 2. Tambah Blok Soal Baru
function addStudioQuestionBlock() {
    if (studioQuestionCount >= MAX_QUESTIONS) {
        return alert(`Batas maksimal adalah ${MAX_QUESTIONS} soal per kuis!`);
    }
    studioQuestionCount++;
    const container = document.getElementById('quiz-questions-list');
    if (container) {
        container.insertAdjacentHTML('beforeend', createQuestionBlockHTML(studioQuestionCount));
    }
    updateStudioQuestionBadge();
}

// 3. Hapus Blok Soal Spresifik
window.removeStudioQuestionBlock = function(index) {
    const block = document.querySelector(`.q-block-item[data-q-index="${index}"]`);
    if (block) {
        block.remove();
        reindexStudioQuestionBlocks();
    }
};

// 4. Urutkan Ulang Nomor Soal Setelah Dihapus
function reindexStudioQuestionBlocks() {
    const blocks = document.querySelectorAll('.q-block-item');
    studioQuestionCount = blocks.length;
    blocks.forEach((b, idx) => {
        const newNum = idx + 1;
        b.setAttribute('data-q-index', newNum);
        const titleSpan = b.querySelector('span');
        if (titleSpan) titleSpan.textContent = `📌 Soal #${newNum}`;
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

// Inisialisasi Soal #1 Otomatis
function initStudioForm() {
    const container = document.getElementById('quiz-questions-list');
    if (container && container.children.length === 0) {
        studioQuestionCount = 0;
        addStudioQuestionBlock();
    }
}

// Event Klik Tombol Tambah Soal
document.getElementById('btn-add-question-block')?.addEventListener('click', () => {
    addStudioQuestionBlock();
});

// Jalankan Inisialisasi Awal Form
initStudioForm();

// 5. EVENT HANDLER PUBLISH KUIS MULTI-SOAL
document.getElementById('btn-publish-quiz')?.addEventListener('click', async () => {
    if (!auth.currentUser) {
        return alert("Kamu wajib login Google di menu Rank terlebih dahulu untuk menerbitkan kuis!");
    }

    const title = document.getElementById('studio-quiz-title').value.trim();
    const category = document.getElementById('studio-quiz-category').value;

    if (!title) {
        return alert("Judul kuis tidak boleh kosong!");
    }

    // Ambil Data Dari Semua Blok Soal yang Ada
    const questionBlocks = document.querySelectorAll('.q-block-item');
    const questionsArray = [];

    for (let i = 0; i < questionBlocks.length; i++) {
        const b = questionBlocks[i];
        const sentence = b.querySelector('.q-sentence')?.value.trim();
        const word = b.querySelector('.q-word')?.value.trim();
        const question = b.querySelector('.q-question')?.value.trim();
        const opt1 = b.querySelector('.q-opt1')?.value.trim();
        const opt2 = b.querySelector('.q-opt2')?.value.trim();
        const opt3 = b.querySelector('.q-opt3')?.value.trim();
        const opt4 = b.querySelector('.q-opt4')?.value.trim();
        const correctIdx = b.querySelector('.q-correct')?.value;
        const explanation = b.querySelector('.q-explanation')?.value.trim();

        if (!sentence || !question || !opt1 || !opt2) {
            return alert(`Soal #${i + 1} belum lengkap! Lengkapi kalimat Arab, pertanyaan, dan minimal Opsi A & B.`);
        }

        const optionsArray = [opt1, opt2, opt3, opt4].filter(o => o !== '');

        questionsArray.push({
            sentence: sentence,
            word: word,
            question: question,
            options: optionsArray,
            correctIndex: correctIdx,
            explanation: explanation
        });
    }

    const authorNameValue = (typeof currentUserNickname !== 'undefined' && currentUserNickname) 
        ? currentUserNickname 
        : (auth.currentUser.displayName || "Santri Anonim");

    try {
        const btn = document.getElementById('btn-publish-quiz');
        btn.disabled = true;
        btn.innerText = "Menerbitkan...";

        const response = await fetch('/api/quiz-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: auth.currentUser.uid,
                authorName: authorNameValue,
                title: title,
                category: category,
                questions: questionsArray
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            btn.disabled = false;
            btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Terbitkan Kuis ke Arena';
            return alert(`Gagal terhubung (${response.status}): ${errText}`);
        }

        const data = await response.json();
        btn.disabled = false;
        btn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Terbitkan Kuis ke Arena';

        if (data.success) {
            alert(data.message);
            // Reset Form kembali ke Soal #1
            document.getElementById('studio-quiz-title').value = '';
            document.getElementById('quiz-questions-list').innerHTML = '';
            initStudioForm();
        } else {
            alert("Gagal menerbitkan: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi server!");
    }
});


/// end 






