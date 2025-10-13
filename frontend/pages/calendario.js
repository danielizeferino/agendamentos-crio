// pages/calendario.js
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt-br';

// ===== Salas (mock fixo só pra UI) =====
const ROOMS = [
  { id: 'alfa',  nome: 'Sala Alfa',  bloco: 'Bloco A', cap: 6,  features: ['TV','Whiteboard'] },
  { id: 'beta',  nome: 'Sala Beta',  bloco: 'Bloco A', cap: 10, features: ['Projetor','TV'] },
  { id: 'gama',  nome: 'Sala Gama',  bloco: 'Bloco B', cap: 20, features: ['Projetor','Som','Mic'] },
  { id: 'delta', nome: 'Sala Delta', bloco: 'Bloco C', cap: 4,  features: ['Whiteboard'] },
];

// ===== Componente de Modal (tema CRIO) =====
function ConfirmModal({ open, onClose, onConfirm, info }) {
  if (!open) return null;
  return (
    <>
      <div className="crioModalOverlay" onClick={onClose} />
      <div className="crioModal">
        <div className="crioModalHeader">
          <div className="dot green" />
          <div className="dot orange" />
          <div className="dot green" />
          <span>Confirmar agendamento</span>
        </div>

        <div className="crioModalBody">
          <div className="resume">
            <div><strong>Sala:</strong> {info.salaNome}</div>
            <div><strong>Data:</strong> {info.dateBR}</div>
            <div><strong>Início:</strong> {info.start}</div>
            <div><strong>Fim:</strong> {info.end}</div>
          </div>

          <p className="hint">
            Após confirmar, enviaremos a confirmação por WhatsApp (quando disponível).
          </p>
        </div>

        <div className="crioModalActions">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>

      <style jsx>{`
        .crioModalOverlay{
          position:fixed; inset:0; background:rgba(0,0,0,.25); backdrop-filter: blur(2px);
          z-index:1000;
        }
        .crioModal{
          position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
          width:min(520px, 92vw); background:#fff; border-radius:20px; overflow:hidden;
          box-shadow: 0 30px 70px rgba(0,0,0,.20); z-index:1001;
          border:1px solid rgba(0,0,0,.06);
        }
        .crioModalHeader{
          display:flex; align-items:center; gap:8px;
          padding:14px 16px; font-weight:600; background:linear-gradient(90deg,var(--crio-green) 0%, #f5f5f5 60%);
          color:#263238;
        }
        .dot{width:8px;height:8px;border-radius:999px;}
        .dot.green{background:var(--crio-green);}
        .dot.orange{background:var(--crio-orange);}
        .crioModalBody{padding:16px 16px 0 16px;}
        .resume{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin-bottom:8px;}
        .hint{margin:12px 0 0 0;color:#6b7280;font-size:13px}
        .crioModalActions{display:flex;justify-content:flex-end;gap:10px;padding:16px;}
        .btn{padding:10px 14px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;cursor:pointer}
        .btn.ghost{background:#f9fafb}
        .btn.primary{background:var(--crio-orange); color:#fff; border-color:var(--crio-orange); font-weight:600}
        .btn.primary:hover{filter:brightness(0.97)}
      `}</style>
    </>
  );
}

export default function Calendario() {
  const router = useRouter();
  const calRef = useRef(null);

  // ===== estado principal =====
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState('beta');        // default Sala Beta
  const [view, setView] = useState('dayGridMonth');
  const [currentDateLabel, setCurrentDateLabel] = useState('');

  // seleção manual
  const [date, setDate] = useState('');            // YYYY-MM-DD
  const [start, setStart] = useState('');          // HH:mm
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [preview, setPreview] = useState(null);

  // ==== auth guard ====
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) router.replace('/login');
    else setUser(JSON.parse(u));
  }, [router]);

  // ==== fc api helpers ====
  const api = () => calRef.current?.getApi();
  const goToday = () => api()?.today();
  const prev = () => api()?.prev();
  const next = () => api()?.next();
  const changeView = (v) => { setView(v); api()?.changeView(v); };

  // ==== carregar eventos ====
  async function fetchEvents(info, success, failure){
    try{
      const r = await fetch(`${API}/api/slots`);
      const all = await r.json();
      const startR = info.startStr, endR = info.endStr;

      const filtered = (Array.isArray(all)?all:[])
        .filter(ev => ev.room === room)
        .filter(ev => !(ev.end <= startR || ev.start >= endR))
        .map(ev => ({ id: ev.id, title: ev.title || 'Reserva', start: ev.start, end: ev.end }));

      success(filtered);
    }catch(e){ console.error(e); failure(e); }
  }

  // título central
  function handleDatesSet(arg){
    const d = arg.view.currentStart;
    setCurrentDateLabel(d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}));
  }

  // clicar num dia → preenche data
  function handleDateClick(info){
    const clickedDate = info.dateStr; // YYYY-MM-DD
    setDate(clickedDate);
    changeView('timeGridDay');
    api()?.gotoDate(clickedDate);
  }

  // abrir modal
  function openConfirm(){
    if(!date || !start || !end){ alert('Preencha data, início e fim.'); return; }
    if(start >= end){ alert('O horário final deve ser maior que o inicial.'); return; }

    const salaNome = ROOMS.find(r=>r.id===room)?.nome || 'Sala';
    const [y,m,d] = date.split('-');
    const dateBR = `${d}/${m}/${y}`;

    setPreview({ salaNome, dateBR, start, end });
    setOpenModal(true);
  }

  // confirmar (salvar)
  async function confirmBooking(){
    if(!preview) return;
    setOpenModal(false);
    setLoading(true);

    const startISO = `${date}T${start}:00`;
    const endISO   = `${date}T${end}:00`;

    try{
      const res = await fetch(`${API}/api/slots`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          title: `Reserva - ${user?.nome || user?.name || 'Usuário'}`,
          start: startISO,
          end: endISO,
          room,
        }),
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || 'Erro ao agendar');

      // recarrega eventos e limpa campos de hora
      api()?.refetchEvents();
      setStart(''); setEnd('');
      toast('Agendado com sucesso!');
    }catch(e){ toast(e.message || 'Falha no agendamento'); }
    finally{ setLoading(false); }
  }

  // toasts simples
  function toast(msg){
    const el = document.createElement('div');
    el.className = 'crioToast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>{ el.classList.add('show'); }, 10);
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=> el.remove(), 250);
    }, 2600);
  }

  return (
    <div className="layout">
      {/* Topo */}
      <header className="topbar">
        <div className="brand">
          <img src="/crio-mark.png" alt="CRIO" className="brandMark" />
          <div>
            <div className="title">Agendamento de Salas</div>
            <div className="subtitle">R. Henrique Lage, 666 - Centro, Criciúma</div>
          </div>
        </div>
        <input className="search" placeholder="Buscar sala..." />
        <div className="userchip">{user?.nome || user?.name}</div>
      </header>

      {/* Layout */}
      <div className="page">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="card">
            <div className="cardTitle">Salas</div>
            {ROOMS.map(s => (
              <button key={s.id}
                      className={`room ${room===s.id?'active':''}`}
                      onClick={()=>{ setRoom(s.id); api()?.refetchEvents(); }}>
                <div className="roomTop">
                  <div className="roomName">{s.nome}</div>
                  <span className="badge">{s.bloco}</span>
                </div>
                <div className="muted">{s.cap} lugares</div>
                <div className="chips" style={{marginTop:6}}>
                  {s.features.map(f => <span key={f} className="chip ghost">{f}</span>)}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="content">
          <div className="calendarHeader">
            <div className="navBtns">
              <button className="btn ghost" onClick={prev}>◀</button>
              <button className="btn ghost" onClick={next}>▶</button>
              <button className="btn" onClick={goToday}>Hoje</button>
            </div>
            <div className="monthTitle">{currentDateLabel}</div>
            <div className="viewBtns">
              <button className={`btn ${view==='dayGridMonth'?'active':'ghost'}`} onClick={()=>changeView('dayGridMonth')}>Mês</button>
              <button className={`btn ${view==='timeGridWeek'?'active':'ghost'}`} onClick={()=>changeView('timeGridWeek')}>Semana</button>
              <button className={`btn ${view==='timeGridDay'?'active':'ghost'}`} onClick={()=>changeView('timeGridDay')}>Dia</button>
            </div>
          </div>

          {/* Form + Calendar */}
          <div className="card big">
            <div className="formRow">
              <div>
                <div className="muted">Data</div>
                <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div>
                <div className="muted">Início</div>
                <input type="time" step="1800" className="input" value={start} onChange={e=>setStart(e.target.value)} />
              </div>
              <div>
                <div className="muted">Fim</div>
                <input type="time" step="1800" className="input" value={end} onChange={e=>setEnd(e.target.value)} />
              </div>
              <div>
                <button className="btn primary" onClick={openConfirm} disabled={loading}>Agendar sala</button>
              </div>
            </div>

            <div style={{marginTop:20}}>
              <FullCalendar
                ref={calRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                locales={[ptLocale]} locale="pt-br"
                headerToolbar={false}
                initialView={view}
                events={fetchEvents}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                selectable={false}
                weekends={true}
                height="auto"
                slotMinTime="00:00:00"
                slotMaxTime="24:00:00"
                slotDuration="00:30:00"
                eventColor="var(--crio-orange)"
                eventTextColor="#fff"
                nowIndicator={true}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      <ConfirmModal
        open={openModal}
        onClose={()=>setOpenModal(false)}
        onConfirm={confirmBooking}
        info={preview || {salaNome:'', dateBR:'', start:'', end:''}}
      />

      {/* Tema + estilos do layout que você aprovou */}
      <style jsx global>{`
        :root{
          --crio-green:#B4D334;
          --crio-orange:#F58220;
          --muted:#6b7280;
          --line:#ececec;
        }
        html,body,#__next{height:100%;}
        body{font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;}
        .crioToast{
          position:fixed; left:50%; bottom:24px; transform:translateX(-50%) translateY(16px);
          background:#111; color:#fff; padding:10px 14px; border-radius:12px; opacity:0;
          transition:.25s ease; z-index:1500; box-shadow:0 10px 30px rgba(0,0,0,.25)
        }
        .crioToast.show{opacity:1; transform:translateX(-50%) translateY(0)}
      `}</style>

      <style jsx>{`
        .layout{min-height:100vh; background:url('/calendar-bg.jpg') center/cover no-repeat fixed;}
        .topbar{
          position:sticky; top:0; display:flex; align-items:center; gap:16px;
          padding:14px 20px; background:rgba(255,255,255,0.7); backdrop-filter:blur(6px);
          border-bottom:1px solid rgba(0,0,0,.06); z-index:20;
        }
        .brand{display:flex; align-items:center; gap:12px;}
        .brandMark{width:36px;height:36px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .title{font-weight:700}
        .subtitle{font-size:12px;color:var(--muted)}
        .search{flex:1;max-width:520px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#fff}
        .userchip{background:#111;color:#fff;padding:8px 12px;border-radius:999px}

        .page{display:grid;grid-template-columns:320px 1fr;gap:20px;padding:20px;align-items:start}
        @media (max-width:1020px){ .page{grid-template-columns:1fr;} }

        .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .big{padding:20px;}
        .cardTitle{font-weight:700;margin-bottom:10px}
        .muted{font-size:13px;color:var(--muted)}
        .chips{display:flex;flex-wrap:wrap;gap:8px}
        .chip{border:1px solid #e5e7eb;padding:6px 10px;border-radius:999px;font-size:12px;background:#fff}
        .chip.ghost{background:#f8f8f8}
        .badge{background:#eef2ff;color:#3b5bdb;padding:4px 8px;border-radius:999px;font-size:12px;border:1px solid #dbe0ff}
        .room{width:100%;text-align:left;padding:12px;border:1px dashed #eee;border-radius:12px;margin-bottom:10px;background:#fff;cursor:pointer;transition:.15s ease}
        .room:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .room.active{border:1px solid #111}
        .roomTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
        .roomName{font-weight:600}

        .calendarHeader{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:12px}
        .navBtns,.viewBtns{display:flex;gap:8px}
        .viewBtns{justify-content:flex-end}
        .monthTitle{text-transform:lowercase}
        .btn{padding:8px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;transition:.15s ease}
        .btn:hover{transform:translateY(-1px);box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .btn.ghost{background:#f9f9f9}
        .btn.active{background:#111;color:#fff;border-color:#111}
        .btn.primary{background:var(--crio-green); color:#263238; border-color:var(--crio-green); font-weight:700}
        .btn.primary:hover{filter:brightness(0.98)}

        .input{padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;outline:none;background:#fff;min-width:180px}
        .formRow{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end}
      `}</style>
    </div>
  );
}
