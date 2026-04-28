// ============================================================
// js/admin.js
// Panel Admin — dawuh images CRUD
// ============================================================

import { db } from './firebase.js';
import { ref, push, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { sha256, compressImage } from './utils.js';
import {
    els,
    SECRET_HASH,
    tapCount, setTapCount,
    tapTimer, setTapTimer,
    uploadBase64, setUploadBase64
} from './state.js';

// --- Secret tap to open admin ---
export function handleSecretTap() {
    setTapCount(tapCount + 1);
    clearTimeout(tapTimer);
    setTapTimer(setTimeout(() => setTapCount(0), 500));
    if (tapCount + 1 === 3) {
        els.adminPanel.style.display = 'flex';
        setTapCount(0);
    }
}

// --- Login ---
export async function handleAdminLogin() {
    const hash = await sha256(els.adminPass.value);
    if (hash === SECRET_HASH) unlockAdminPanel();
    else alert('Sandi Salah!');
}

// --- Close admin ---
export function closeAdmin() {
    els.adminPanel.style.display  = 'none';
    els.adminPass.value           = '';
    els.adminLogin.style.display  = 'block';
    els.adminDash.style.display   = 'none';
}

// --- Unlock admin dashboard ---
function unlockAdminPanel() {
    els.adminLogin.style.display = 'none';
    els.adminDash.style.display  = 'block';
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
        <button id="btn-save-img" class="btn-primary" style="margin-top:10px; background:var(--ios-green);">Simpan Gambar</button>
        <h3 style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Galeri Dawuh</h3>
        <div id="admin-list" class="suggestion-list" style="margin-top:10px;"></div>
    `;

    const btnUrl = document.getElementById('tab-url');
    const btnUpl = document.getElementById('tab-upl');
    const boxUrl = document.getElementById('form-url');
    const boxUpl = document.getElementById('form-upl');
    const inpUrl = document.getElementById('dawuh-url');
    let mode     = 'url';

    btnUrl.onclick = () => { mode = 'url'; btnUrl.classList.add('active'); btnUpl.classList.remove('active'); boxUrl.style.display = 'block'; boxUpl.style.display = 'none'; };
    btnUpl.onclick = () => { mode = 'upl'; btnUpl.classList.add('active'); btnUrl.classList.remove('active'); boxUpl.style.display = 'block'; boxUrl.style.display = 'none'; };

    document.getElementById('file-inp').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            compressImage(e.target.files[0], (base64) => {
                setUploadBase64(base64);
                const preview     = document.getElementById('img-preview');
                preview.src       = base64;
                preview.style.display = 'block';
            });
        }
    });

    document.getElementById('btn-save-img').addEventListener('click', () => {
        const cap      = document.getElementById('dawuh-caption').value.trim();
        const finalUrl = mode === 'url' ? inpUrl.value.trim() : uploadBase64;
        if (!finalUrl) { alert('Gambar belum dipilih/diisi!'); return; }

        push(ref(db, 'dawuh_images'), { url: finalUrl, caption: cap }).then(() => {
            alert('Gambar Berhasil Disimpan!');
            inpUrl.value = '';
            document.getElementById('dawuh-caption').value = '';
            setUploadBase64(null);
            document.getElementById('img-preview').style.display = 'none';
        });
    });

    loadAdminList();
}

// --- Load gallery list ---
function loadAdminList() {
    onValue(ref(db, 'dawuh_images'), (snapshot) => {
        const list = document.getElementById('admin-list');
        if (!list) return;
        list.innerHTML = '';
        const data = snapshot.val();

        if (!data) {
            list.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px;">Galeri kosong.</p>';
            return;
        }

        Object.entries(data).forEach(([key, val]) => {
            const div         = document.createElement('div');
            div.className     = 'suggest-item';
            div.style.cssText = 'display:flex; flex-direction:row; justify-content:space-between; align-items:center; gap:10px;';

            const leftDiv       = document.createElement('div');
            leftDiv.style.cssText = 'display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;';
            leftDiv.innerHTML   = `
                <img src="${val.url}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; flex-shrink:0;">
                <span style="font-size:12px; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${val.caption || 'Tanpa Keterangan'}</span>
            `;

            const delBtn       = document.createElement('button');
            delBtn.innerText   = 'Hapus';
            delBtn.style.cssText = 'background:var(--ios-red); border:none; color:white; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:600; cursor:pointer; flex-shrink:0;';
            delBtn.onclick     = () => { if (confirm('Yakin mau hapus gambar ini?')) remove(ref(db, `dawuh_images/${key}`)); };

            div.appendChild(leftDiv);
            div.appendChild(delBtn);
            list.appendChild(div);
        });
    });
}
