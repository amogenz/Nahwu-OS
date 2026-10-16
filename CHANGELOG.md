# Changelog Nahwu OS

## 2026-10-16 — DB kembali + quiz/syarah pas layar

### Database
- `firebaseConfig` dikembalikan ke project `amogenz` (DB lama yang sudah
  ada lafadz dkk), menggantikan `amogenz-inc`. API server memang tidak
  pernah pindah, jadi client & server kini selaras lagi.

### Quiz & dialog: otomatis pas layar
- `#view-quiz` jadi flex column setinggi viewport (tanpa scroll):
  kartu lafadz + pertanyaan fixed, opsi jawaban mengisi sisa ruang.
- `.content-area`: padding 145px/150px sisa desain lama → 20px/120px.
- `.modal-card` feedback quiz: compact, `max-height: calc(100dvh - 32px)`.

## 2026-10-13 — AMOGENZ VIBE (wujud web) + audit keamanan

### Desain: AMOGENZ VIBE wujud web
- Palet & token persis web utama amogenz.xyz: gelap soft `#101210`/`#212421`/
  `#262826`, terang soft `#F2F2ED`/`#FAFAF6`, aksen hijau `#4CAF50`
  (teks hijau `#7CC47F` gelap / `#2E7D32` terang).
- Toggle tema gelap/terang (tersimpan di `localStorage`).
- Font UI: Inter (standar web); Amiri tetap untuk lafadz Arab.
- Navigasi model "pulau" dipertahankan tapi **ditempel** (tidak melayang):
  bar atas (logo + marquee dawuh + globe + toggle tema) dan bottom-nav
  5 halaman (Home/Syarah/Arena/Info/Rank) menempel ke bawah.
- Lepas background Unsplash — latar solid sesuai tema.
- PP, foto Ammo, dan ucapan salam dipertahankan persis seperti aslinya.
- `theme-color` menjadi `#4CAF50`.

### Notifikasi & dialog (VIBE)
- 50× `alert()` bawaan browser diganti **banner** yang hilang sendiri.
- 3× `confirm()` diganti **Dialog Aksi** baku (Batal kiri, aksi kanan);
  konfirmasi logout dihapus (aksi reversible tidak perlu ditanya).
- Emoji UI diganti ikon garis Phosphor (satu ikon satu makna);
  angka skor/rank pakai digit tabular.

### Keamanan (hasil audit)
- `api/quiz-create.js`: **impersonasi** — uid/authorName dari body tanpa
  verifikasi. Kini wajib `Authorization: Bearer <ID Token>`, uid diambil
  dari token terverifikasi (pola sama seperti `submit-score.js`).
- `api/dawuh-manage.js`: key hapus & URL gambar kini divalidasi
  (format key, skema `http(s)`).
- `api/syarah.js`: proxy AI diperketat — batas 2000 karakter prompt,
  rate limit 20 req/menit/IP, safety filter Google dikembalikan aktif,
  CORS dirapikan.
- `submit-score.js`: sudah aman (ID Token + rate limit + hitung server-side).

### Bug
- `style.css` kini ikut cache-busting (`?v=`) via `/api/version` —
  sebelumnya hanya `script.js`, sehingga update CSS bisa tidak terlihat user.

## Sebelumnya

- 2026-09-16: Merge PR #33 — upload file (dev environment).
- 2026-09-11: Clear cache & ambil DB terkini otomatis.
