
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, set, update, remove, onValue, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ════════════════════════════════════
   FIREBASE INIT
════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyDpvXKwY16EbGtcHX7_Hmz2huHqtznrw8A",
  authDomain: "acsc-6fe84.firebaseapp.com",
  databaseURL: "https://acsc-6fe84-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "acsc-6fe84",
  storageBucket: "acsc-6fe84.firebasestorage.app",
  messagingSenderId: "615328669047",
  appId: "1:615328669047:web:e85bb2bb8641d0ba6fd572"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ════════════════════════════════════
   CONSTANTS
════════════════════════════════════ */
const ROOMS = [
  { id: 0, name: 'Ruang Juang', sub: 'Ceritakan perjuanganmu', prompt: '"Apa satu hal kecil hari ini yang bikin kamu mau terus bertahan?"',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#e8845a" stroke-width="1.8"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M2 2l20 20"/></svg>` },
  { id: 1, name: 'Ruang Rasa', sub: 'Kamu boleh apa adanya di sini', prompt: '"Kalau perasaanmu hari ini adalah cuaca, langitnya seperti apa?"',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#9b7eb8" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
  { id: 2, name: 'Ruang Gembira', sub: 'Rayakan momen bahagiamu', prompt: '"Hal kecil apa yang tidak kamu rencanakan, tapi bikin hatimu hangat?"',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#5a9e7a" stroke-width="1.8"><path d="M12 22V12"/><path d="M20 7a8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 16 0z"/></svg>` },
  { id: 3, name: 'Ruang Baru', sub: 'Babak baru selalu tersedia', prompt: '"Satu hal dari masa lalu yang sudah bisa kamu damaikan dalam dirimu?"',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="#5a8fbe" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>` }
];

const REACTIONS = [
  { label: 'Pelukan', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
  { label: 'Semangat', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
  { label: 'Kagum', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` },
  { label: 'Kuat', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>` },
  { label: 'Damai', svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M12 12l-4.24-4.24"/><path d="M12 12l4.24 4.24"/></svg>` }
];

const AVA_COLORS = [
  { bg: '#FFE5D9', fg: '#c9603a' },
  { bg: '#EDE1FF', fg: '#7a5ca8' },
  { bg: '#D9F0E5', fg: '#3a8a5a' },
  { bg: '#D9E9FF', fg: '#3a6aaa' },
  { bg: '#FFE9E9', fg: '#aa4a4a' },
  { bg: '#FFF4D9', fg: '#aa7a2a' }
];

const ROOM_COLORS = ['#e8845a','#9b7eb8','#5a9e7a','#5a8fbe'];
const ROOM_SOFT = ['rgba(232,132,90,0.1)','rgba(155,126,184,0.1)','rgba(90,158,122,0.1)','rgba(90,143,190,0.1)'];

const PEN_NAMES = [
  'Pengelana Fajar','Penjaga Mimpi','Si Kecil Berani','Pelaut Darat',
  'Langkah Pelan','Bintang Redup','Jejak Hujan','Pencari Cahaya',
  'Jiwa Tenang','Pemimpi Malam','Teman Sendiri','Pemilik Sunyi',
  'Kabut Pagi','Awan Terbang','Bunga Liar','Langit Senja'
];

const EDIT_LIMIT_MS = 60 * 60 * 1000; // 1 hour

/* ════════════════════════════════════
   STATE
════════════════════════════════════ */
let currentRoom = 0;
let myUserId = '';
let myUsername = '';
let postsListener = null;
let currentPosts = {};
let sharePostData = null;
let pendingConfirmCallback = null;

/* ════════════════════════════════════
   USER IDENTITY (localStorage)
════════════════════════════════════ */
function initUser() {
  myUserId = localStorage.getItem('lt_uid');
  if (!myUserId) {
    myUserId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('lt_uid', myUserId);
  }
  myUsername = localStorage.getItem('lt_name') || '';
}

function getInitial(name) {
  if (!name || name === 'Anonim') return '?';
  return name.trim()[0].toUpperCase();
}

function getAvaColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return AVA_COLORS[Math.abs(h) % AVA_COLORS.length];
}

function updateUserUI() {
  const name = myUsername || 'Anonim';
  const init = getInitial(name);
  const el = document.getElementById('home-ava-badge');
  const nl = document.getElementById('home-name-badge');
  if (el) el.textContent = init;
  if (nl) nl.textContent = name;

  const tapAva = document.getElementById('tap-avatar-initial');
  const formAva = document.getElementById('form-ava-initial');
  const formName = document.getElementById('form-name-display');
  if (tapAva) tapAva.textContent = init;
  if (formAva) {
    formAva.textContent = init;
    const c = getAvaColor(name);
    formAva.style.background = c.bg;
    formAva.style.color = c.fg;
  }
  if (formName) formName.textContent = name;
}

/* ════════════════════════════════════
   SETUP SCREEN
════════════════════════════════════ */
window.setupPickRandom = function() {
  const inp = document.getElementById('setup-name-input');
  inp.value = PEN_NAMES[Math.floor(Math.random() * PEN_NAMES.length)];
  inp.focus();
};

window.finishSetup = function() {
  const inp = document.getElementById('setup-name-input');
  const name = inp.value.trim();
  if (!name) { showToast('Isi nama dulu ya'); return; }
  myUsername = name;
  localStorage.setItem('lt_name', name);
  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('home-screen').classList.add('active');
  updateUserUI();
  loadRoomCounts();
};

// Enter key on setup
document.getElementById('setup-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.finishSetup();
});

/* ════════════════════════════════════
   USERNAME MODAL
════════════════════════════════════ */
window.openUsernameModal = function() {
  const inp = document.getElementById('username-modal-input');
  inp.value = myUsername || '';
  openModal('username-modal');
  setTimeout(() => inp.focus(), 300);
};

window.pickRandomName = function() {
  document.getElementById('username-modal-input').value = PEN_NAMES[Math.floor(Math.random() * PEN_NAMES.length)];
};

window.saveUsername = function() {
  const val = document.getElementById('username-modal-input').value.trim();
  if (!val) { showToast('Nama tidak boleh kosong'); return; }
  myUsername = val;
  localStorage.setItem('lt_name', val);
  updateUserUI();
  closeModal('username-modal');
  showToast('Nama berhasil diganti');
};

document.getElementById('username-modal-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.saveUsername();
});

/* ════════════════════════════════════
   NAVIGATION
════════════════════════════════════ */
window.goHome = function() {
  document.getElementById('home-screen').classList.add('active');
  document.getElementById('room-screen').classList.remove('active');
  setBottomNav('home');
  closeWrite();
  if (postsListener) { postsListener(); postsListener = null; }
};

window.openRoom = function(idx) {
  currentRoom = idx;
  const room = ROOMS[idx];
  const rs = document.getElementById('room-screen');
  rs.className = 'screen r' + idx;
  document.getElementById('room-title').textContent = room.name;
  document.getElementById('room-sub').textContent = room.sub;
  document.getElementById('room-prompt').textContent = room.prompt;
  document.getElementById('room-icon-el').innerHTML = room.iconSvg;

  document.getElementById('home-screen').classList.remove('active');
  rs.classList.add('active');
  setBottomNav(idx);
  closeWrite();
  listenPosts(idx);
  rs.scrollTop = 0;
};

function setBottomNav(active) {
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const el = active === 'home'
    ? document.getElementById('bnav-home')
    : document.getElementById('bnav-' + active);
  if (el) el.classList.add('active');
}

/* ════════════════════════════════════
   FIREBASE — LISTEN POSTS
════════════════════════════════════ */
function listenPosts(roomIdx) {
  if (postsListener) postsListener();
  const container = document.getElementById('posts-list');
  container.innerHTML = `<div class="posts-loading"><div class="spinner"></div><span>Memuat cerita…</span></div>`;

  const postsRef = ref(db, `rooms/${roomIdx}/posts`);
  postsListener = onValue(postsRef, snap => {
    currentPosts = {};
    const data = snap.val() || {};
    // Convert to array, newest first
    const arr = Object.entries(data).map(([k, v]) => ({ ...v, _key: k }));
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    arr.forEach(p => { currentPosts[p._key] = p; });
    renderPosts(arr, roomIdx);
    updateCount(roomIdx, arr.length);
  });
}

function loadRoomCounts() {
  [0,1,2,3].forEach(i => {
    const postsRef = ref(db, `rooms/${i}/posts`);
    get(postsRef).then(snap => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      updateCount(i, count);
    });
  });
}

function updateCount(roomIdx, n) {
  const el = document.getElementById('count' + roomIdx);
  if (el) el.textContent = n + ' cerita';
}

/* ════════════════════════════════════
   WRITE
════════════════════════════════════ */
window.openWrite = function() {
  document.getElementById('write-tap').classList.add('hidden');
  document.getElementById('write-form').classList.add('open');
  document.getElementById('write-textarea').focus();
};

window.closeWrite = function() {
  document.getElementById('write-tap').classList.remove('hidden');
  document.getElementById('write-form').classList.remove('open');
  document.getElementById('write-textarea').value = '';
};

window.autoResize = function(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

window.submitPost = async function() {
  const text = document.getElementById('write-textarea').value.trim();
  if (!text) { showToast('Tulis dulu ya, sekecil apapun ceritamu'); return; }

  const name = myUsername || 'Anonim';
  const postRef = ref(db, `rooms/${currentRoom}/posts`);
  const newPost = {
    author: name,
    uid: myUserId,
    text,
    createdAt: Date.now(),
    reactions: { r0:0, r1:0, r2:0, r3:0, r4:0 }
  };

  try {
    await push(postRef, newPost);
    closeWrite();
    showToast('Ceritamu sudah dibagikan');
    document.getElementById('posts-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e) {
    showToast('Gagal mengirim. Coba lagi.');
  }
};

/* ════════════════════════════════════
   RENDER POSTS
════════════════════════════════════ */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'baru saja';
  if (m < 60) return m + 'mnt lalu';
  if (h < 24) return h + 'j lalu';
  return d + ' hari lalu';
}

function canEdit(post) {
  return post.uid === myUserId && (Date.now() - (post.createdAt || 0)) < EDIT_LIMIT_MS;
}

function canDelete(post) {
  return post.uid === myUserId;
}

function editTimeLeft(post) {
  const remaining = EDIT_LIMIT_MS - (Date.now() - (post.createdAt || 0));
  if (remaining <= 0) return null;
  const mins = Math.floor(remaining / 60000);
  return mins > 0 ? mins + ' mnt lagi bisa diedit' : 'segera tidak bisa diedit';
}

function renderPosts(arr, roomIdx) {
  const container = document.getElementById('posts-list');
  if (!arr.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </div>
        <p>Belum ada cerita di sini.<br>Jadilah yang pertama berbagi.</p>
      </div>`;
    return;
  }
  container.innerHTML = arr.map(post => postHTML(post, roomIdx)).join('');
}

function postHTML(post, roomIdx) {
  const c = getAvaColor(post.author || 'Anonim');
  const init = getInitial(post.author);
  const isMine = post.uid === myUserId;
  const myReacts = post.myReacts || {};

  const reactsHTML = REACTIONS.map((r, i) => {
    const key = 'r' + i;
    const count = (post.reactions || {})[key] || 0;
    const active = myReacts[key] ? 'active' : '';
    return `<button class="react-chip ${active}" onclick="toggleReact('${post._key}','${key}',${currentRoom})">
      ${r.svg}<span class="rcount">${count || ''}</span>
    </button>`;
  }).join('');

  const repostTag = post.repostOf ? `
    <div class="repost-tag">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      Direpost dari cerita lain
    </div>` : '';

  const editBadge = isMine ? (() => {
    const left = editTimeLeft(post);
    return left ? `<div class="edit-timer-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ${left}
    </div>` : '';
  })() : '';

  return `
  <div class="post-item${isMine ? ' mine' : ''}" id="post-${post._key}">
    ${repostTag}
    <div class="post-head">
      <div class="post-ava" style="background:${c.bg};color:${c.fg}">${init}</div>
      <div class="post-meta-info">
        <div class="post-author-name">${escHtml(post.author || 'Anonim')}</div>
        <div class="post-time">${timeAgo(post.createdAt || 0)}</div>
      </div>
      <div class="post-actions-row">
        <button class="post-action-btn" title="Bagikan" onclick="openShare('${post._key}', ${roomIdx})">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="post-action-btn" title="Opsi" onclick="openPostMenu('${post._key}', ${roomIdx})">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
    ${editBadge}
    <div class="post-body" id="body-${post._key}">${escHtml(post.text)}</div>
    <div id="edit-zone-${post._key}"></div>
    <div class="reactions-row">${reactsHTML}</div>
    <button class="toggle-comments-btn" onclick="toggleComments('${post._key}', ${roomIdx})">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Komentar
    </button>
    <div id="comments-${post._key}" style="display:none"></div>
  </div>`;
}

/* ════════════════════════════════════
   REACTIONS
════════════════════════════════════ */
window.toggleReact = async function(postKey, rKey, roomIdx) {
  const post = currentPosts[postKey];
  if (!post) return;
  const myReacts = post.myReacts || {};
  const wasActive = !!myReacts[rKey];
  const currentCount = (post.reactions || {})[rKey] || 0;
  const newCount = wasActive ? Math.max(0, currentCount - 1) : currentCount + 1;

  // Optimistic update
  if (!post.myReacts) post.myReacts = {};
  post.myReacts[rKey] = !wasActive;
  if (!post.reactions) post.reactions = {};
  post.reactions[rKey] = newCount;

  // Update reaction chip visually
  const postEl = document.getElementById('post-' + postKey);
  if (postEl) {
    const chips = postEl.querySelectorAll('.react-chip');
    const idx = parseInt(rKey.replace('r',''));
    const chip = chips[idx];
    if (chip) {
      chip.classList.toggle('active', !wasActive);
      chip.querySelector('.rcount').textContent = newCount || '';
      chip.style.transform = 'scale(1.2)';
      setTimeout(() => chip.style.transform = '', 200);
    }
  }

  try {
    const updates = {};
    updates[`rooms/${roomIdx}/posts/${postKey}/reactions/${rKey}`] = newCount;
    await update(ref(db), updates);
  } catch(e) { /* revert on fail */ }
};

/* ════════════════════════════════════
   POST MENU (edit / delete / repost)
════════════════════════════════════ */
window.openPostMenu = function(postKey, roomIdx) {
  const post = currentPosts[postKey];
  if (!post) return;
  const isMine = post.uid === myUserId;
  const menu = document.getElementById('action-menu-items');
  const title = document.getElementById('action-modal-title');
  title.textContent = isMine ? 'Opsi Postinganmu' : 'Opsi';

  let items = '';

  if (isMine && canEdit(post)) {
    items += `<div class="action-menu-item" onclick="startEdit('${postKey}');closeModal('action-modal')">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit Postingan
    </div>`;
  }

  items += `<div class="action-menu-item" onclick="repostPost('${postKey}',${roomIdx});closeModal('action-modal')">
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
    Repost
  </div>`;

  if (isMine) {
    items += `<div class="action-menu-item danger" onclick="confirmDelete('${postKey}',${roomIdx});closeModal('action-modal')">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      Hapus Postingan
    </div>`;
  }

  menu.innerHTML = items;
  openModal('action-modal');
};

/* ════════════════════════════════════
   EDIT POST
════════════════════════════════════ */
window.startEdit = function(postKey) {
  const post = currentPosts[postKey];
  if (!post || !canEdit(post)) return;

  const bodyEl = document.getElementById('body-' + postKey);
  const zoneEl = document.getElementById('edit-zone-' + postKey);
  if (!bodyEl || !zoneEl) return;

  bodyEl.style.display = 'none';
  zoneEl.innerHTML = `
    <textarea class="post-edit-area" id="edit-ta-${postKey}" rows="4">${post.text}</textarea>
    <div class="post-edit-actions">
      <button class="btn-cancel-edit" onclick="cancelEdit('${postKey}')">Batal</button>
      <button class="btn-save-edit" onclick="saveEdit('${postKey}', ${currentRoom})">Simpan</button>
    </div>`;
  autoResize(document.getElementById('edit-ta-' + postKey));
};

window.cancelEdit = function(postKey) {
  const bodyEl = document.getElementById('body-' + postKey);
  const zoneEl = document.getElementById('edit-zone-' + postKey);
  if (bodyEl) bodyEl.style.display = '';
  if (zoneEl) zoneEl.innerHTML = '';
};

window.saveEdit = async function(postKey, roomIdx) {
  const ta = document.getElementById('edit-ta-' + postKey);
  if (!ta) return;
  const newText = ta.value.trim();
  if (!newText) { showToast('Teks tidak boleh kosong'); return; }

  try {
    await update(ref(db, `rooms/${roomIdx}/posts/${postKey}`), { text: newText, editedAt: Date.now() });
    showToast('Postingan berhasil diedit');
  } catch(e) {
    showToast('Gagal menyimpan edit');
  }
};

/* ════════════════════════════════════
   DELETE POST
════════════════════════════════════ */
window.confirmDelete = function(postKey, roomIdx) {
  document.getElementById('confirm-title').textContent = 'Hapus Postingan?';
  document.getElementById('confirm-text').textContent = 'Postingan ini akan dihapus permanen dan tidak bisa dikembalikan.';
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.onclick = () => doDelete(postKey, roomIdx);
  openModal('confirm-modal');
};

async function doDelete(postKey, roomIdx) {
  closeModal('confirm-modal');
  try {
    await remove(ref(db, `rooms/${roomIdx}/posts/${postKey}`));
    showToast('Postingan dihapus');
  } catch(e) {
    showToast('Gagal menghapus');
  }
}

/* ════════════════════════════════════
   REPOST
════════════════════════════════════ */
window.repostPost = async function(postKey, roomIdx) {
  const post = currentPosts[postKey];
  if (!post) return;
  const name = myUsername || 'Anonim';
  const newPost = {
    author: name,
    uid: myUserId,
    text: post.text,
    createdAt: Date.now(),
    repostOf: postKey,
    repostAuthor: post.author,
    reactions: { r0:0, r1:0, r2:0, r3:0, r4:0 }
  };
  try {
    await push(ref(db, `rooms/${roomIdx}/posts`), newPost);
    showToast('Berhasil direpost!');
  } catch(e) {
    showToast('Gagal repost');
  }
};

/* ════════════════════════════════════
   COMMENTS
════════════════════════════════════ */
const commentsListeners = {};

window.toggleComments = function(postKey, roomIdx) {
  const el = document.getElementById('comments-' + postKey);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  if (isOpen) {
    el.style.display = 'none';
    if (commentsListeners[postKey]) { commentsListeners[postKey](); delete commentsListeners[postKey]; }
  } else {
    el.style.display = 'block';
    loadComments(postKey, roomIdx, el);
  }
};

function loadComments(postKey, roomIdx, container) {
  container.innerHTML = `<div class="posts-loading" style="padding:16px 0"><div class="spinner"></div></div>`;
  const commRef = ref(db, `rooms/${roomIdx}/posts/${postKey}/comments`);
  commentsListeners[postKey] = onValue(commRef, snap => {
    const data = snap.val() || {};
    const arr = Object.entries(data).map(([k,v]) => ({...v, _key:k}));
    arr.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));
    renderComments(postKey, arr, container, roomIdx);
  });
}

function renderComments(postKey, arr, container, roomIdx) {
  const commentsHTML = arr.map(c => {
    const cc = getAvaColor(c.author || 'Anonim');
    return `<div class="comment-item">
      <div class="comment-ava" style="background:${cc.bg};color:${cc.fg}">${getInitial(c.author)}</div>
      <div class="comment-bubble">
        <div class="comment-author">${escHtml(c.author || 'Anonim')}</div>
        <div class="comment-text">${escHtml(c.text)}</div>
        <div class="comment-time">${timeAgo(c.createdAt||0)}</div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="comments-section">
      ${commentsHTML || '<div style="font-size:12px;color:var(--text3);padding:8px 0">Belum ada komentar.</div>'}
      <div class="comment-write-row">
        <textarea class="comment-input" id="ci-${postKey}" placeholder="Tulis komentar…" rows="1" oninput="autoResize(this)"></textarea>
        <button class="comment-send-btn" onclick="sendComment('${postKey}',${roomIdx})">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>`;
}

window.sendComment = async function(postKey, roomIdx) {
  const inp = document.getElementById('ci-' + postKey);
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  const name = myUsername || 'Anonim';
  inp.value = '';
  inp.style.height = 'auto';
  try {
    await push(ref(db, `rooms/${roomIdx}/posts/${postKey}/comments`), {
      author: name, uid: myUserId, text, createdAt: Date.now()
    });
  } catch(e) {
    showToast('Gagal kirim komentar');
  }
};

/* ════════════════════════════════════
   SHARE
════════════════════════════════════ */
window.openShare = function(postKey, roomIdx) {
  const post = currentPosts[postKey];
  if (!post) return;
  sharePostData = { post, postKey, roomIdx };

  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?room=${roomIdx}&post=${postKey}`;
  document.getElementById('share-url-text').textContent = shareUrl;

  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: shareUrl, width: 150, height: 150,
    colorDark: "#2c2420", colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  openModal('share-modal');
};

window.closeShare = function() { closeModal('share-modal'); };
window.closeShareOnBg = function(e) {
  if (e.target === document.getElementById('share-modal')) closeShare();
};

window.copyLink = function() {
  const url = document.getElementById('share-url-text').textContent;
  navigator.clipboard.writeText(url).then(() => showToast('Link disalin!'));
};

async function getPostImageBlob() {
  if (!sharePostData) return null;
  const { post, roomIdx } = sharePostData;
  const room = ROOMS[roomIdx];
  const c = getAvaColor(post.author || 'Anonim');
  const accentColor = ROOM_COLORS[roomIdx];

  const reactsHTML = REACTIONS.map((r, i) => {
    const key = 'r' + i;
    const count = (post.reactions || {})[key] || 0;
    if (!count) return '';
    return `<div class="capture-react-chip">${r.svg.replace('currentColor','#6b5e54')}<span>${count}</span></div>`;
  }).join('');

  const card = document.getElementById('post-capture-card');
  card.innerHTML = `
    <div class="capture-header">
      <div class="capture-ava" style="background:${c.bg};color:${c.fg};width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800">${getInitial(post.author)}</div>
      <div>
        <div class="capture-name">${escHtml(post.author || 'Anonim')}</div>
        <div class="capture-meta">${timeAgo(post.createdAt||0)} · ${room.name}</div>
      </div>
    </div>
    <div class="capture-body">${escHtml(post.text)}</div>
    ${reactsHTML ? `<div class="capture-reactions">${reactsHTML}</div>` : ''}
    <div class="capture-footer">
      <div class="capture-brand">✦ La Tahzan</div>
      <div class="capture-room-tag" style="background:${ROOM_SOFT[roomIdx]};color:${accentColor}">${room.name}</div>
    </div>`;

  card.style.left = '-9999px';
  card.style.position = 'fixed';

  await new Promise(r => setTimeout(r, 100));
  const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: '#faf7f4', logging: false });
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

window.downloadPostImage = async function() {
  showToast('Membuat gambar…');
  const blob = await getPostImageBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'latahzan-cerita.png'; a.click();
  URL.revokeObjectURL(url);
  showToast('Gambar berhasil diunduh!');
};

window.shareToWA = async function() {
  if (navigator.share) {
    showToast('Membuat gambar…');
    const blob = await getPostImageBlob();
    if (!blob) return;
    try {
      const file = new File([blob], 'latahzan-cerita.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'La Tahzan', text: 'Cerita dari La Tahzan [https://nahwu.amogenz.xyz/latahzan/feed.html]' });
        return;
      }
    } catch(e) {}
  }
  // fallback: open WA with link
  const url = document.getElementById('share-url-text').textContent;
  const waUrl = `https://wa.me/?text=${encodeURIComponent('Baca cerita ini di La Tahzan:\n' + url)}`;
  window.open(waUrl, '_blank');
};

window.shareToIG = async function() {
  showToast('Membuat gambar untuk disimpan…');
  const blob = await getPostImageBlob();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'latahzan-cerita.png'; a.click();
  URL.revokeObjectURL(url);
  showToast('Gambar disimpan! Upload ke Instagram Story-mu');
};

/* ════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
window.closeModal = function(id) {
  document.getElementById(id).classList.remove('active');
};
window.closeModalOnBg = function(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
};

/* ════════════════════════════════════
   TOAST
════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ════════════════════════════════════
   HELPERS
════════════════════════════════════ */
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
initUser();

if (myUsername) {
  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('home-screen').classList.add('active');
  updateUserUI();
  loadRoomCounts();
  // Check deep link
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  const postParam = params.get('post');
  if (roomParam !== null && postParam) {
    const ri = parseInt(roomParam);
    openRoom(ri);
    setTimeout(() => {
      const el = document.getElementById('post-' + postParam);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.borderColor = ROOM_COLORS[ri];
        el.style.transition = '0.5s';
      }
    }, 1500);
  }
}

// Expose toast globally for HTML usage
window.showToast = showToast;
window.openModal = openModal;