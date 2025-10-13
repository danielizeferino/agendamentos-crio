// backend/src/server.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ---------- health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- seed rooms (uma vez no boot) ----------
async function seedRooms() {
  const rooms = [
    { id: 'alfa',  name: 'Sala Alfa',  block: 'Bloco A', capacity: 6,  features: 'TV,Whiteboard' },
    { id: 'beta',  name: 'Sala Beta',  block: 'Bloco A', capacity: 10, features: 'Projetor,TV' },
    { id: 'gama',  name: 'Sala Gama',  block: 'Bloco B', capacity: 20, features: 'Projetor,Som,Mic' },
    { id: 'delta', name: 'Sala Delta', block: 'Bloco C', capacity: 4,  features: 'Whiteboard' },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }
}

// ---------- login ----------
app.post('/api/login', async (req, res) => {
  try {
    const { name, email, whatsapp } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'Preencha nome e e-mail.' });
    }
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, whatsapp },
      create: { name, email, whatsapp },
    });
    return res.json({ ok: true, user });
  } catch (err: any) {
    console.error('[/api/login] ERROR:', err?.message, err?.meta || '');
    return res.status(500).json({ error: err?.message || 'Erro interno' });
  }
});

// helpers
const isoDate = (iso: string) => iso.split('T')[0];
const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// ---------- slots ----------
app.get('/api/slots', async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { room: true, user: true },
    orderBy: { start: 'asc' },
  });
  // mantém o mesmo shape que o front usa:
  const out = bookings.map(b => ({
    id: b.id,
    title: b.title,
    start: b.start.toISOString(),
    end: b.end.toISOString(),
    room: b.roomId,
  }));
  res.json(out);
});

app.post('/api/slots', async (req, res) => {
  try {
    const { title, start, end, room } = req.body || {};
    if (!title || !start || !end || !room) {
      return res.status(400).json({ error: 'Informe title, start, end e room' });
    }

    const startDate = new Date(start);
    const endDate   = new Date(end);
    if (!(startDate instanceof Date) || !(endDate instanceof Date) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data/hora inválido' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'Horário final deve ser maior que o inicial' });
    }

    // conflito: mesma sala e interseção de intervalo
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId: room,
        AND: [
          { start: { lt: endDate } },
          { end:   { gt: startDate } },
        ],
      },
      select: { id: true },
    });
    if (conflict) {
      return res.status(409).json({ error: 'Conflito: horário já ocupado nesta sala.' });
    }

    const slot = await prisma.booking.create({
      data: {
        title,
        start: startDate,
        end: endDate,
        room: { connect: { id: room } },
        // se quiser associar ao usuário, passe userId aqui
      },
      select: { id: true, title: true, start: true, end: true, roomId: true },
    });

    return res.status(201).json({
      ok: true,
      slot: {
        ...slot,
        start: slot.start.toISOString(),
        end:   slot.end.toISOString(),
        room:  slot.roomId,
      },
    });
  } catch (err: any) {
    console.error('[/api/slots] ERROR:', err?.message);
    return res.status(500).json({ error: err?.message || 'Erro interno' });
  }
});

// ---------- start ----------
async function start() {
  await seedRooms();
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✅ API rodando em http://localhost:${PORT}`);
  });
}
start().catch(e => {
  console.error('Falha ao iniciar servidor:', e);
  process.exit(1);
});
