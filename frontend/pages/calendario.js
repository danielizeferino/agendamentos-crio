const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt-br';
import { FaWhatsapp } from 'react-icons/fa';

export default function Calendario() {
  const router = useRouter();
  const calRef = useRef(null);
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState('');
  const [toast, setToast] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [confirmData, setConfirmData] = useState({});
  const [view, setView] = useState('dayGridMonth');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) router.replace('/');
    else setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    fetch(`${API}/api/rooms`)
      .then((r) => r.json())
      .then((data) => {
        setRooms(data);
        if (data.length) setRoom(data[0].id);
      })
      .catch(console.error);
  }, []);

  const api = () => calRef.current?.getApi();

  function fetchEvents(info, success) {
    fetch(`${API}/api/slots`)
      .then((r) => r.json())
      .then((all) => {
        const subset = all.filter((ev) => (room ? ev.roomId === room : true));
        success(subset);
      });
  }

  async function reservar() {
    if (!room || !date || !start || !end) {
      setToast('Preencha todos os campos antes de continuar.');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    setConfirmData({
      sala: rooms.find((r) => r.id === room)?.name,
      data: date,
      inicio: start,
      fim: end,
    });
    setShowModal(true);
  }

  async function confirmarReserva() {
    const startISO = `${date}T${start}:00`;
    const endISO = `${date}T${end}:00`;

    const salaSelecionada = rooms.find((r) => r.id === room);
    if (!salaSelecionada) return;

    if (salaSelecionada.name.toLowerCase().includes('principal')) {
      setShowModal(false);
      setToast(
        'O agendamento será feito mediante confirmação via WhatsApp. Aguarde a confirmação do responsável.'
      );
      setTimeout(() => setToast(''), 4000);
      return;
    }

    try {
      const res = await fetch(`${API}/api/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Reserva - ${user?.name}`,
          room,
          start: startISO,
          end: endISO,
          userEmail: user?.email,
        }),
      });

      if (res.ok) {
        setToast('Sala reservada com sucesso!');
        api()?.refetchEvents();
      } else {
        setToast('Erro ao reservar sala.');
      }
    } catch {
      setToast('Erro ao conectar ao servidor.');
    }
    setShowModal(false);
    setTimeout(() => setToast(''), 3500);
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          <img src="/crio-mark.png" alt="CRIO" className="brandMark" />
          <div className="txt">
            <div className="title">Agendamento de Salas</div>
          </div>
        </div>
        <div className="userchip">{user?.name}</div>
      </header>

      <div className="page">
        <aside className="sidebar">
          <div className="card">
            <div className="cardTitle">Salas</div>
            {rooms.map((s) => (
              <button
                key={s.id}
                className={`room ${room === s.id ? 'active' : ''}`}
                onClick={() => {
                  setRoom(s.id);
                  api()?.refetchEvents();
                }}
              >
                <div className="roomTop">
                  <div>{s.name}</div>
                  <span className="badge">{s.block}</span>
                </div>
                <div className="muted">
                  {s.capacity} lugares • {s.features}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="content">
          <div className="calendarHeader">
            <div className="formRow">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              <button className="btn primary" onClick={reservar}>
                Agendar sala
              </button>
            </div>
          </div>

          <div className="calendarCard">
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              events={fetchEvents}
              locale={ptLocale}
              height="auto"
            />
          </div>
        </main>
      </div>

      <footer className="footer">
        <div>Centro de Inovação Criciúma</div>
        <div>R. Henrique Lage, 666 - Centro, Criciúma - SC, 88801-010</div>
        <div>(48) 3519-1000 • crio@unesc.net</div>
      </footer>

      {showModal && (
        <div className="modalOverlay">
          <div className="modalGlass">
            <h3>Confirmar Agendamento</h3>
            <p>
              <b>Sala:</b> {confirmData.sala}
            </p>
            <p>
              <b>Data:</b> {confirmData.data}
            </p>
            <p>
              <b>Início:</b> {confirmData.inicio}
            </p>
            <p>
              <b>Fim:</b> {confirmData.fim}
            </p>
            <div className="btnRow">
              <button className="btn primary" onClick={confirmarReserva}>
                Confirmar
              </button>
              <button className="btn" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
            {confirmData.sala?.toLowerCase().includes('principal') && (
              <a
                href="https://wa.me/554835191000"
                target="_blank"
                className="whatsappBtn"
              >
                <FaWhatsapp size={18} /> Entrar em contato via WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <style jsx>{`
        .layout {
          background: linear-gradient(
              rgba(255, 255, 255, 0.85),
              rgba(255, 255, 255, 0.85)
            ),
            url('/calendar-bg.jpg') center/cover no-repeat;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          background: white;
          align-items: center;
          border-bottom: 1px solid #eee;
          z-index: 5;
        }

        .brandMark {
          width: 120px;
        }

        .page {
          flex: 1;
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 15px;
          padding: 20px;
        }

        .sidebar {
          overflow-y: auto;
        }

        .room {
          width: 100%;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          transition: all 0.2s ease;
        }

        .room:hover {
          background: #f9fafb;
        }

        .room.active {
          border: 2px solid #b4d334;
        }

        .calendarCard {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(4px);
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05);
        }

        .formRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 15px;
        }

        .btn.primary {
          background: #b4d334;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
        }

        .footer {
          background: linear-gradient(180deg, #1e4b50, #295f63);
          color: white;
          text-align: center;
          padding: 15px 0;
          font-size: 14px;
          z-index: 1;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: grid;
          place-items: center;
          z-index: 99999;
        }

        .modalGlass {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 25px;
          max-width: 380px;
          width: calc(100% - 32px);
          text-align: center;
          animation: pop 0.2s ease-out;
        }

        @keyframes pop {
          from {
            transform: scale(0.98);
            opacity: 0.6;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .btnRow {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }

        .toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #111;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          z-index: 9999;
        }

        .whatsappBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25d366;
          color: #fff;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 8px;
          margin-top: 14px;
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .page {
            grid-template-columns: 1fr;
          }
          .topbar {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
