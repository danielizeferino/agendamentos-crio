// pages/login.js
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whats, setWhats] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!name || !email) { setErr('Preencha nome e e-mail.'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, whatsapp: whats })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha no login');

      if (remember) {
        localStorage.setItem('user', JSON.stringify({
          id: data.user?.id,
          nome: data.user?.name || name,
          email: data.user?.email || email,
          whatsapp: data.user?.whatsapp || whats
        }));
      }
      router.push('/calendario');
    } catch (e) {
      setErr(e.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginLayout">
      <div className="card">
        <div className="head">
          <img src="/crio-mark.png" alt="CRIO" />
          <div>
            <h1>Agendamento de Salas</h1>
            <p>Acesse sua conta</p>
          </div>
        </div>

        <form onSubmit={submit} className="form">
          <label>Nome completo</label>
          <input
            type="text" placeholder="Seu nome"
            value={name} onChange={e=>setName(e.target.value)} autoFocus
          />

          <label>E-mail</label>
          <input
            type="email" placeholder="seu@email.com"
            value={email} onChange={e=>setEmail(e.target.value)}
          />

          <label>WhatsApp (opcional)</label>
          <input
            type="tel" placeholder="(48) 99999-9999"
            value={whats} onChange={e=>setWhats(e.target.value)}
          />

          <div className="row">
            <label className="remember">
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>
              <span>Lembrar-me</span>
            </label>
            <a className="link" href="#" onClick={(e)=>e.preventDefault()}>Esqueci minha senha</a>
          </div>

          {err && <div className="error">{err}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="footNote">
            Não tem conta? <a href="#" onClick={(e)=>e.preventDefault()}>Criar cadastro</a>
          </div>
        </form>

        <p className="demoHint">Dica (demo): admin@empresa.com / 123456</p>
      </div>

      <style jsx>{`
        :global(html,body,#__next){height:100%}
        .loginLayout{
  min-height: 100vh;                /* garante tela inteira */
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(255,255,255,.90)),
    url('/login-bg.jpg');
  background-size: cover;           /* preenche (pode cortar) */
  background-position: center 50%;  /* ajusta foco (ex.: mostra mais o topo) */
  background-repeat: no-repeat;
}

/* iOS não curte 'fixed'. Evite em mobile. */
@media (max-width: 768px){
  .loginLayout{
    background-attachment: scroll;
    background-image:
      linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.90)),
      url('/login-bg-mobile.jpg'); /* se tiver uma versão mobile */
    background-position: center 20%;
  }
}

        .card{
          width:min(420px, 92vw);
          background:#fff;
          border:1px solid rgba(0,0,0,.06);
          border-radius:20px;
          box-shadow: 0 20px 50px rgba(0,0,0,.10);
          padding:24px;
        }

        .head{display:flex; gap:12px; align-items:center; margin-bottom:14px;}
        .head img{
          width:36px; height:36px; border-radius:10px; background:#fff; padding:4px;
          box-shadow:0 6px 18px rgba(0,0,0,.08);
        }
        .head h1{margin:0; font-size:20px; font-weight:700;}
        .head p{margin:0; color:#6b7280; font-size:13px;}

        .form{display:flex; flex-direction:column; gap:10px; margin-top:6px;}
        label{font-size:14px; font-weight:600;}
        input[type="text"], input[type="email"], input[type="tel"]{
          padding:12px 14px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          outline:none;
          background:#fff;
        }
        input:focus{border-color:#9acdf4; box-shadow:0 0 0 4px rgba(14,165,233,.15);}

        .row{display:flex; align-items:center; justify-content:space-between; margin-top:2px;}
        .remember{display:flex; align-items:center; gap:8px; color:#374151; font-size:14px;}
        .link{font-size:14px; color:#2563eb;}

        .error{
          background:#fee2e2; border:1px solid #fecaca; color:#991b1b;
          padding:10px 12px; border-radius:12px; font-size:14px;
        }

        .btn{
          margin-top:4px;
          width:100%; padding:12px 14px; border-radius:12px;
          background:#0ea5e9; color:#fff; border:1px solid #0ea5e9; font-weight:700;
          cursor:pointer; transition:.15s ease;
        }
        .btn:hover{background:#0b82b9;}
        .btn:disabled{opacity:.7; cursor:not-allowed;}

        .divider{display:flex; align-items:center; gap:12px; color:#9ca3af; font-size:12px; margin:10px 0;}
        .divider::before, .divider::after{content:""; height:1px; flex:1; background:#e5e7eb;}

        .btn.google{
          background:#fff; color:#111; border:1px solid #e5e7eb; font-weight:600;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .btn.google img{width:18px; height:18px;}

        .footNote{margin-top:10px; font-size:14px; text-align:center; color:#6b7280;}
        .footNote a{color:#2563eb;}

        .demoHint{margin:8px 2px 0; color:#9ca3af; font-size:12px; text-align:center;}
      `}</style>
    </div>
  );
}
