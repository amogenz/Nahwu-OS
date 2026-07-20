export default async function handler(req, res) {
    // 1. Kunci hanya untuk method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password tidak boleh kosong!' });
        }

        // 2. Cocokkan password inputan user dengan variabel rahasia Vercel
        const ADMIN_SECRET = process.env.ADMIN_PASSWORD;

        if (password === ADMIN_SECRET) {
            return res.status(200).json({ 
                success: true, 
                message: 'Akses Admin Diterima!' 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Password Admin Salah bray!' 
            });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
