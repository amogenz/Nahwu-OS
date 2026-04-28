// ============================================================
// js/firebase.js
// Konfigurasi Firebase — dipakai semua modul
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDyEfe83-_CzRchqcO_lLnuO6Rg9_AF_8",
    authDomain: "amogenz.firebaseapp.com",
    databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "amogenz",
    storageBucket: "amogenz.firebasestorage.app",
    messagingSenderId: "864003468268",
    appId: "1:864003468268:web:7c861806529a0dacd66ec9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
