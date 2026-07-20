import admin from 'firebase-admin';

// Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: "https://amogenz-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { action, password, url, caption, key } = req.body;

        // 1. Verifikasi Password Admin di Server
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Password admin salah bray!' });
        }

        const db = admin.database();

        // 2. Aksi: TAMBAH GAMBAR
        if (action === 'add') {
            if (!url) {
                return res.status(400).json({ success: false, message: 'Gambar/URL tidak boleh kosong!' });
            }

            await db.ref('dawuh_images').push({
                url: url,
                caption: caption || '',
                created_at: Date.now()
            });

            return res.status(200).json({ success: true, message: 'Gambar berhasil disimpan!' });
        }

        // 3. Aksi: HAPUS GAMBAR
        if (action === 'delete') {
            if (!key) {
                return res.status(400).json({ success: false, message: 'ID Gambar tidak valid!' });
            }

            await db.ref(`dawuh_images/${key}`).remove();
            return res.status(200).json({ success: true, message: 'Gambar berhasil dihapus!' });
        }

        return res.status(400).json({ success: false, message: 'Aksi tidak dikenal!' });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
