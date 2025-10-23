import { useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Login() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace('/calendario');
    } catch (err) {
      setError(err.message || 'Falha ao fazer login');
    }
  }

  return (
    <div className="loginPage">
      <form className="loginCard" onSubmit={onSubmit}>
        <img src="/crio-mark.png" alt="Logo CRIO" className="logo" />
        <h1>Agendamento de Salas</h1>

        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          WhatsApp
          <input
            type="tel"
            placeholder="(48) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
        </label>

        <div className="roleRow">
          <label>
            <input
              type="radio"
              name="role"
              value="user"
              checked={role === 'user'}
              onChange={() => setRole('user')}
            />{' '}
            Usuário
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role === 'admin'}
              onChange={() => setRole('admin')}
            />{' '}
            Admin
          </label>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit">Entrar</button>
      </form>

      <style jsx>{`
        .loginPage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: url('/login-bg.jpg') center/cover no-repeat;
          position: relative;
        }

        .loginPage::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(8px);
        }

        .loginCard {
          position: relative;
          width: min(420px, 92vw);
          background: rgba(255, 255, 255, 0.8);
          border-radius: 18px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo {
          width: 180px;
          height: auto;
          margin-bottom: 10px;
          object-fit: contain;
        }

        h1 {
          margin-bottom: 15px;
          font-size: 1.4rem;
          text-align: center;
          color: #111;
        }

        label {
          display: grid;
          gap: 6px;
          margin: 10px 0;
          width: 100%;
          font-weight: 500;
        }

        input {
          padding: 12px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
        }

        .roleRow {
          display: flex;
          gap: 14px;
          margin: 10px 0;
        }

        .error {
          margin-top: 10px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 10px;
          border-radius: 10px;
        }

        button {
          margin-top: 12px;
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: none;
          background: #b4d334;
          color: #263238;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
        }

        button:hover {
          background: #a5c22d;
        }
      `}</style>
    </div>
  );
}
