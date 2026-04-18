// Vite proxy handles /api → localhost:8000 during dev
const API_BASE = import.meta.env.VITE_API_URL || ''

export default API_BASE
