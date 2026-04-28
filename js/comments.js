// ============================================================
// js/comments.js
// Sistem Komentar & Balasan
// ============================================================

import { db } from './firebase.js';
import { ref, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { sha256, compressImage } from './utils.js';
import { ADMIN_PASSWORD_HASH, adminUploadImage, setAdminUploadImage } from './state.js';

// --- Check admin name ---
export function checkAdminName() {
    const nameInput     = document.getElementById('comment-name');
    const passwordField = document.getElementById('admin-password-field');
    const imageUpload   = document.getElementById('admin-image-upload');
    const isAmogenz     = nameInput.value.toLowerCase() === 'amogenz';
    passwordField.style.display = isAmogenz ? 'block' : 'none';
    imageUpload.style.display   = isAmogenz ? 'block' : 'none';
}

// --- Send comment ---
export async function sendComment() {
    const name     = document.getElementById('comment-name').value.trim();
    const msg      = document.getElementById('comment-msg').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!name || !msg) { alert('Nama dan komentar harus diisi!'); return; }

    let isAdmin  = false;
    let imageUrl = null;

    if (name.toLowerCase() === 'amogenz') {
        const hashed = await sha256(password);
        if (hashed !== ADMIN_PASSWORD_HASH) { alert('Password admin salah!'); return; }
        isAdmin = true;
        // gunakan adminUploadImage dari state
        const { adminUploadImage: img } = await import('./state.js');
        if (img) imageUrl = img;
    }

    const commentData = { name, message: msg, timestamp: Date.now(), isAdmin, imageUrl: imageUrl || null, replies: {} };

    push(ref(db, 'suggestions'), commentData).then(() => {
        alert('Komentar berhasil dikirim!');
        document.getElementById('comment-name').value         = '';
        document.getElementById('comment-msg').value          = '';
        document.getElementById('admin-password').value       = '';
        document.getElementById('admin-password-field').style.display = 'none';
        document.getElementById('admin-image-upload').style.display   = 'none';
        setAdminUploadImage(null);
        document.getElementById('image-preview-area').style.display   = 'none';
    });
}

// --- Load comments ---
export function loadComments() {
    onValue(query(ref(db, 'suggestions'), limitToLast(20)), (snapshot) => {
        const list = document.getElementById('comments-list');
        if (!list) return;
        list.innerHTML = '';

        const data = snapshot.val();
        if (!data) {
            list.innerHTML = '<p style="text-align:center; font-size:14px; opacity:0.5;">Belum ada komentar.</p>';
            return;
        }

        Object.entries(data).reverse().forEach(([key, item]) => {
            const div       = document.createElement('div');
            div.className   = 'comment-item';

            const dateStr = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '';

            const verifiedBadge = item.isAdmin ? '<span class="verified-badge"><i class="ph-fill ph-seal-check"></i></span>' : '';
            const imageHtml     = item.imageUrl ? `<img src="${item.imageUrl}" class="comment-image" alt="Image">` : '';

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
            if (item.replies) loadReplies(key, item.replies);
        });

        document.querySelectorAll('.btn-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                showReplyForm(e.currentTarget.getAttribute('data-comment-id'));
            });
        });
    });
}

// --- Load replies ---
function loadReplies(commentId, replies) {
    const container = document.getElementById(`replies-${commentId}`);
    if (!container || !replies) return;
    container.innerHTML = '';

    Object.entries(replies).forEach(([, reply]) => {
        const div       = document.createElement('div');
        div.className   = 'reply-item';

        const dateStr = reply.timestamp
            ? new Date(reply.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '';
        const verifiedBadge = reply.isAdmin ? '<span class="verified-badge small"><i class="ph-fill ph-seal-check"></i></span>' : '';

        div.innerHTML = `
            <div class="reply-header">
                <span class="reply-name">${reply.name} ${verifiedBadge}</span>
                <span class="reply-date">${dateStr}</span>
            </div>
            <div class="reply-msg">${reply.message}</div>
        `;
        container.appendChild(div);
    });
}

// --- Show reply form ---
function showReplyForm(commentId) {
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
                <button id="btn-send-reply" class="btn-primary" style="width:100%;">Kirim Balasan</button>
            </div>
        </div>
    `;

    document.body.appendChild(replyModal);
    setTimeout(() => replyModal.classList.add('active'), 10);

    document.getElementById('close-reply-modal').onclick = () => {
        replyModal.classList.remove('active');
        setTimeout(() => replyModal.remove(), 300);
    };

    document.getElementById('btn-send-reply').onclick = async () => {
        const name    = document.getElementById('reply-name').value.trim();
        const message = document.getElementById('reply-message').value.trim();
        if (!name || !message) { alert('Nama dan balasan harus diisi!'); return; }

        push(ref(db, `suggestions/${commentId}/replies`), { name, message, timestamp: Date.now(), isAdmin: false })
            .then(() => {
                alert('Balasan berhasil dikirim!');
                replyModal.classList.remove('active');
                setTimeout(() => replyModal.remove(), 300);
            });
    };
}

// --- Image upload for comments page ---
export function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (base64) => {
        setAdminUploadImage(base64);
        document.getElementById('image-preview').src         = base64;
        document.getElementById('image-preview-area').style.display = 'block';
    });
}

export function removeImage() {
    setAdminUploadImage(null);
    document.getElementById('image-preview-area').style.display = 'none';
    document.getElementById('admin-img-file').value             = '';
}

// --- Init events untuk halaman Info/Comments ---
export function initComments() {
    document.getElementById('comment-name').addEventListener('input', checkAdminName);
    document.getElementById('btn-send-comment').addEventListener('click', sendComment);
    document.getElementById('admin-img-file').addEventListener('change', handleImageUpload);
    document.getElementById('btn-remove-image').addEventListener('click', removeImage);
    loadComments();
}
