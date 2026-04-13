// In development: empty string → Vite proxy handles /api → localhost:8000
// In production (Vercel): set VITE_API_URL to your Railway backend URL
//   e.g. VITE_API_URL=https://logiclens-backend.up.railway.app
const API_BASE = import.meta.env.VITE_API_URL || ''

export default API_BASE
