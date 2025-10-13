import { useEffect, useMemo, useState } from 'react';

const SALAS = ['Sala Alfa', 'Sala Beta', 'Sala Gama', 'Sala Delta'];

function makeSlots() {
  const slots = [];
  for (let h=8; h<=20; h++) { // 08:00 às 20:30
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  return slots;
}
const SLOTS = makeSlots();

export default function Home() {
  const today = new Date().toISOString().slice(0,10);
  const [me, setMe] = useState(null);
  const [room, setRoom] = useState(SALAS[0]);
  const [date, setDate] = useState(today);
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [startSlot, setStartSlot] = useState('09:00');
  const [endSlot, setEndSlot] = useState('10:00');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/me').then(r=>r.json()).then(setMe);
  }, []);

  const startIso = useMemo(() => new Date(`${date}T${startSlot}:00.000Z`).toISOString(), [date,startSlot]);
  const endIso   = useMemo(() => new Date(`${date}T${endSlot}:00.000Z`).toISOString(), [date,endSlot]);

  async function load() {
    const q = new URLSearchParams({ room, date }).toString();
    const r = await fetch(`/api/events?${q}`);
    const data = await r.json();
    setEvents(data);
  }

  useEffect(() => { load(); }, [room, date]);

  async function agendar() {
    setMsg('');
    try {
      if (!title) throw new Error('Informe um título');
      if (endIso <= startIso) throw new Error('Fim deve ser depois do início');
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ room, title, start: startIso, end: endIso })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao agendar');
      setTitle('');
      await load();
      setMsg('Agendado com sucesso! Você receberá a confirmação no WhatsApp.');
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (!me) {
    return (
      <div className="center">
        <div className="card narrow">
          <h3>Você precisa fazer login</h3>
          <a className="btn" href="/login">Ir para o login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-bg">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="logo">RS</div>
          <div>
            <div className="brand-title">Agendador de Salas</div>
            <div className="brand-sub">Visão mensal · mock</div>
          </div>
        </div>
        <div className="search">
          <input placeholder="Buscar sala..." />
        </div>
        <div className="user">Olá, {me.name}</div>
      </header>

      <main className="layout">
        {/* Filtros */}
        <aside className="panel">
          <h4>Filtros</h4>
          <div className="filter">
            <label>Capacidade mínima</label>
            <input type="range" min="1" max="30" defaultValue="1"/>
          </div>

          <h4>Salas</h4>
          <div className="rooms">
            {SALAS.map(s => (
              <button
                key={s}
                className={`room ${room===s?'active':''}`}
                onClick={() => setRoom(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* Calendário simplificado */}
        <section className="panel wide">
          <div className="toolbar">
            <div className="month">
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div className="views">
              <button className="active">Mês</button>
              <button disabled>Semana</button>
              <button disabled>Dia</button>
            </div>
          </div>

          <div className="calendar-card">
            <h3>{new Date(date).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}</h3>

            {/* Form de agendamento */}
            <div className="grid2">
              <div>
                <label>Título</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Reunião" />
              </div>
              <div>
                <label>Horário</label>
                <div className="row">
                  <select value={startSlot} onChange={e=>setStartSlot(e.target.value)}>
                    {SLOTS.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{margin:'0 8px'}}>—</span>
                  <select value={endSlot} onChange={e=>setEndSlot(e.target.value)}>
                    {SLOTS.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn" onClick={agendar}>Agendar</button>
                </div>
              </div>
            </div>

            {msg && <p className="notice">{msg}</p>}

            <h4 style={{marginTop:16}}>Reservas do dia · {room}</h4>
            <ul className="list">
              {events.length===0 && <li>Nenhuma reserva.</li>}
              {events.map(ev => (
                <li key={ev.id}>
                  <strong>{ev.title}</strong> — {new Date(ev.start).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                  {' às '}
                  {new Date(ev.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                  <br/>
                  <small>por {ev.userName} ({ev.userPhone || ev.userEmail || '—'})</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
