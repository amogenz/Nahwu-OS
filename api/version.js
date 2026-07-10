export default function handler(req, res) {
  // Vercel otomatis nyediain SHA commit git tiap deploy — ini "sidik jari" unik tiap update
  const version = process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();
  res.setHeader('Cache-Control', 'no-store'); // endpoint ini sendiri gak boleh ke-cache
  res.status(200).json({ version });
}
