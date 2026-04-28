// ============================================================
// js/state.js
// State global yang dipakai bersama antar modul
// ============================================================

// --- Quiz State ---
export let quizData       = null;
export let wordIndex      = 0;
export let stepIndex      = 1;
export let quizScore      = { correct: 0, wrong: 0, total: 0 };
export let currentDatabase = 'lv1';

export function setQuizData(val)        { quizData = val; }
export function setWordIndex(val)       { wordIndex = val; }
export function setStepIndex(val)       { stepIndex = val; }
export function setCurrentDatabase(val) { currentDatabase = val; }
export function resetQuizScore()        { quizScore = { correct: 0, wrong: 0, total: 0 }; }
export function incrementCorrect()      { quizScore.correct++; quizScore.total++; }
export function incrementWrong()        { quizScore.wrong++;   quizScore.total++; }

// --- Dawuh State ---
export let dawuhImagesCache = [];
export let dawuhIndex       = 0;
export function setDawuhImagesCache(val) { dawuhImagesCache = val; }
export function setDawuhIndex(val)       { dawuhIndex = val; }

// --- Admin State ---
export let uploadBase64    = null;
export let tapCount        = 0;
export let tapTimer        = null;
export let isAdminLoggedIn = false;
export let adminUploadImage = null;
export function setUploadBase64(val)    { uploadBase64 = val; }
export function setTapCount(val)        { tapCount = val; }
export function setTapTimer(val)        { tapTimer = val; }
export function setIsAdminLoggedIn(val) { isAdminLoggedIn = val; }
export function setAdminUploadImage(val){ adminUploadImage = val; }

// --- DOM Elements Cache (diisi saat initApp) ---
export let els = {};
export function setEls(obj) { els = obj; }

// --- Constants ---
export const SECRET_HASH        = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa";
export const ADMIN_PASSWORD_HASH = "f7c9e33170483039dc0613eb865591a36222932780928c5a1b03487276265ffa";

export const DAWUH_PLAYLIST = [
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
