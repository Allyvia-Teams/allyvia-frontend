import axios from 'axios';

const API_BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1';

export async function getGoogleAuthorizeUrl(flow: 'login' | 'signup' = 'login'): Promise<{ auth_url: string; state: string }> {
  const { data } = await axios.get(`${API_BASE}/auth/google/authorize/`, { params: { flow }, withCredentials: true });
  return data;
}
