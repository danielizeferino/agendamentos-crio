// frontend/lib/api.ts
export async function login(form: { name: string; email: string; whatsapp?: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL; // http://localhost:3001
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });

  const data = await res.json();
  if (!res.ok) {
    // mostra o erro que veio do backend
    throw new Error(data?.error || 'Erro ao entrar');
  }
  return data; // { ok: true, user: {...} }
}
