# Nahwu OS

Web belajar Nahwu–Shorof interaktif bertenaga AI — **cara seru belajar Nahwu**.
Live: https://nahwu.amogenz.xyz/

Dibangun oleh **Amogenz** (komunitas "Spirit of Youth & Technology", est. 2021)
bekerja sama dengan para santri. Maskot & pendamping belajar: **Ammo** 🦉.

## Fitur

- **Belajar I'rob** — latihan interaktif per level kitab: Jurumiyah, Imrithi,
  Alfiyah (Isim & Fi'il), Shorof, Bina, Tasrif. Mode Biasa & Mode Rank.
- **Syarah AI** — tempel lafadz Arab, AI (Gemini) mengurai i'rob langkah
  demi langkah, dengan cache Firebase untuk hemat kuota.
- **Arena Santri** — mainkan kuis buatan santri lain, atau terbitkan kuismu
  sendiri via Studio (maks 14 soal, login Google wajib).
- **Top Global Rank** — papan peringkat global berbasis skor terverifikasi.
- **Info & Komentar** — komentar komunitas + gambar dawuh dari admin.

## Teknologi

- Frontend: HTML + CSS + JavaScript (ES module), ikon Phosphor, font Inter/Amiri
- Backend: Vercel Serverless Functions (`/api`)
- Database & Auth: Firebase (Realtime Database Asia-Southeast1 + Google Auth)
- AI: Google Gemini 2.5 Flash (7 API key dengan load-balancing & auto-retry)

## Struktur

```
index.html      Halaman utama (5 halaman SPA: home, syarah, arena, info, rank)
style.css       Sistem desain AMOGENZ VIBE wujud web (gelap/terang)
script.js       Logika utama frontend (ES module)
script-arena.js Modul Arena & Studio kuis komunitas (dipecah dari script.js
                agar tiap file < batas ukuran push; dimuat via dynamic import
                dengan cache-bust versi yang sama)
vercel.json     Header no-cache untuk HTML
api/
  admin-verify.js   Verifikasi sandi admin (env ADMIN_PASSWORD)
  dawuh-manage.js   Kelola gambar dawuh (tambah/hapus, proteksi sandi)
  quiz-create.js    Terbitkan kuis (wajib ID Token Firebase — anti-impersonasi)
  submit-score.js   Submit skor (ID Token + rate limit + hitung di server)
  syarah.js         Proxy Gemini (batas prompt, rate limit per-IP)
  version.js        Versi deploy (dipakai cache-busting script.js & style.css)
```

## Desain

Mengikuti **AMOGENZ VIBE** dalam wujud web (standar web, bukan standar aplikasi):
palet gelap soft `#101210` / terang soft `#F2F2ED`, aksen hijau `#4CAF50`,
ikon garis Phosphor, banner auto-dismiss pengganti `alert()`, dialog aksi
hanya untuk keputusan permanen. Navigasi model "pulau" khas Nahwu OS —
ditempel ke atas & bawah (tidak melayang). Toggle tema gelap/terang
tersimpan di `localStorage`.

Dikecualikan dari aturan anti-emoji: foto profil, foto Ammo, dan ucapan salam
"Assalamualaikum … Saya Ammo 🦉 …" — itu suara brand yang dipertahankan.

## Environment variables (Vercel)

| Nama | Kegunaan |
|---|---|
| `ADMIN_PASSWORD` | Sandi admin (dawuh & panel admin) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account Firebase Admin SDK |
| `GEMINI_API_KEY[_1..6]` | Kunci Gemini untuk Syarah AI |

## Keamanan

- Skor & penerbitan kuis: identitas **hanya** dari ID Token Firebase yang
  diverifikasi server (`quiz-create.js`, `submit-score.js`) — bukan dari body.
- `dawuh-manage.js`: format key & skema URL divalidasi server-side.
- `syarah.js`: batas 2000 karakter prompt, rate limit 20 req/menit/IP,
  safety filter bawaan Google aktif.
- Komentar & kuis komunitas: output di-escape (`escapeHTML` / `cleanInput`).

## Changelog

Lihat [CHANGELOG.md](CHANGELOG.md).
