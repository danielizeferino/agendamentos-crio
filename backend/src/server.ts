import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT) || 3001;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);
app.use(express.json());

// --------- Mailer (console fallback) ---------
const smtpHost = process.env.SMTP_HOST;
let transporter: nodemailer.Transporter;
if (smtpHost) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true }); // loga no console
}
const FROM = process.env.SMTP_FROM || 'CRIO <no-reply@crio.local>';

// ---------------- health ----------------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// -------------- login -------------------
/**
 * Recebe {name, email, role?} e devolve {role: 'admin'|'user'}
 * Regra: admin se email === ADMIN_EMAIL
 */
app.post('/api/login', (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
  const isAdmin = String(email).toLowerCase() === ADMIN_EMAIL;
  return res.json({ ok: true, user: { name, email, role: isAdmin ? 'admin' : 'user' } });
});

// -------------- rooms -------------------
const seedRoomsData = [
  { id: 'terreo',        name: 'Térreo',            block: 'Térreo',   capacity: 80,  features: 'TV' },
  { id: 'r1-terreo',     name: 'R1 - térreo',       block: 'Térreo',   capacity: 6,   features: 'TV' },
  { id: 'c1-terreo',     name: 'C1 - térreo',       block: 'Térreo',   capacity: 2,   features: '' },
  { id: 'r1-1andar',     name: 'R1 - 1º andar',     block: '1º andar', capacity: 20,  features: 'TV' },
  { id: 'r2-1andar',     name: 'R2 - 1º andar',     block: '1º andar', capacity: 4,   features: '' },
  { id: 'auditorio-1',   name: 'Auditório 1',       block: 'Auditório',capacity: 50,  features: 'TV' },
  { id: 'r2-2andar',     name: 'R2 - 2º andar',     block: '2º andar', capacity: 4,   features: '' },
  { id: 'r3-2andar',     name: 'R3 - 2º andar',     block: '2º andar', capacity: 6,   features: 'TV' },
  { id: 'auditorio-princ', name: 'Auditório principal', block: 'Auditório', capacity: 300, features: 'TV' },
];

async function seedRooms() {
  for (const r of seedRoomsData) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: { name: r.name, block: r.block, capacity: r.capacity, features: r.features },
      create: { id: r.id, name: r.name, block: r.block, capacity: r.capacity, features: r.features },
    });
  }
}

app.get('/api/rooms', async (_req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
  res.json(rooms);
});

// -------------- slots -------------------
/**
 * Regras:
 * - Admin (email == ADMIN_EMAIL) vê TODAS as reservas.
 * - Usuário comum não vê nada (lista vazia) — só recebe erro de conflito ao tentar agendar.
 */
app.get('/api/slots', async (req, res) => {
  const email = String(req.header('X-User-Email') || '').toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  if (!isAdmin) return res.json([]); // usuário comum não enxerga reservas alheias
  const slots = await prisma.slot.findMany({ orderBy: { start: 'asc' } });
  res.json(slots);
});

/**
 * POST /api/slots
 * body: { title, room, start, end, userEmail }
 * - Auditórios (cap >= 50): NÃO cria. Retorna 202 + mensagem WhatsApp
 * - Salas pequenas: checa conflito; se conflitar -> 409 "ERRO - SALA JA RESERVADA..."
 *   Se OK -> cria e envia e-mail ao ADMIN
 */
app.post('/api/slots', async (req, res) => {
  try {
    const { title, room, start, end, userEmail } = req.body || {};
    if (!room || !start || !end) return res.status(400).json({ error: 'Dados incompletos.' });

    const roomObj = await prisma.room.findUnique({ where: { id: String(room) } });
    if (!roomObj) return res.status(404).json({ error: 'Sala não encontrada.' });

    // Auditórios: não cria; retorna aviso
    if (roomObj.capacity >= 50) {
      return res.status(202).json({
        ok: false,
        notice: 'O agendamento será feito mediante comprovação via WhatsApp. Aguarde a confirmação do CRIO.',
      });
    }

    const startDt = new Date(start);
    const endDt = new Date(end);
    if (!(startDt < endDt)) return res.status(400).json({ error: 'Horário inválido.' });

    // Conflito: (start < existing.end) && (end > existing.start)
    const conflict = await prisma.slot.findFirst({
      where: {
        roomId: roomObj.id,
        AND: [{ start: { lt: endDt } }, { end: { gt: startDt } }],
      },
      select: { id: true },
    });
    if (conflict) {
      return res.status(409).json({ error: 'ERRO - SALA JA RESERVADA, TENTE OUTRA OPCAO' });
    }

    // Cria
    const created = await prisma.slot.create({
      data: {
        title: title || 'Reserva',
        roomId: roomObj.id,
        start: startDt,
        end: endDt,
        userEmail: userEmail || null,
      },
    });

    // E-mail para admin (salas pequenas)
    const to = ADMIN_EMAIL || userEmail;
    if (to) {
      await transporter.sendMail({
        from: FROM,
        to,
        subject: `Nova reserva - ${roomObj.name}`,
        text: `Sala: ${roomObj.name}\nInício: ${start}\nFim: ${end}\nSolicitante: ${userEmail || 'N/I'}`,
      });
    }

    return res.json({ ok: true, slot: created });
  } catch (err: any) {
    console.error('POST /api/slots error:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// -------- start ----------
async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await seedRooms();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ API rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Falha ao iniciar servidor:', err);
    process.exit(1);
  }
}
start();
