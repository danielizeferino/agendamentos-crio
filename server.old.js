// server.js
const express = require('express');
const next = require('next');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

// --- DB ---
const DB_PATH = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_PATH);

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT UNIQUE NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room TEXT NOT NULL,
        title TEXT NOT NULL,
        start TEXT NOT NULL,  -- ISO
        end   TEXT NOT NULL,  -- ISO
        userId INTEGER NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `);
  });
}

function is30MinStep(iso) {
  const d = new Date(iso);
  const m = d.getUTCMinutes();
  return m === 0 || m === 30;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return (aStart < bEnd) && (bStart < aEnd);
}

// --- n8n notify ---
async function notifyN8n(event, user) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'booking_created', event, user })
    });
  } catch (e) {
    console.error('[n8n] erro ao notificar:', e.message);
  }
}

// --- APP ---
app.prepare().then(() => {
  initDb();
  const server = express();
  server.use(express.json());
  server.use(cookieParser());

  // LOGIN/REGISTRO (nome, email, phone)
  server.post('/api/login', (req, res) => {
    const { name, email, phone } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios.' });
    }
    db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (row) {
        // update name/email
        db.run('UPDATE users SET name=?, email=? WHERE id=?', [name, email || null, row.id], (e2) => {
          if (e2) return res.status(500).json({ error: 'DB error' });
          res.cookie('userId', row.id, { httpOnly: false });
          return res.json({ ok: true, userId: row.id });
        });
      } else {
        db.run('INSERT INTO users (name, email, phone) VALUES (?,?,?)', [name, email || null, phone], function (e3) {
          if (e3) return res.status(500).json({ error: 'DB error' });
          res.cookie('userId', this.lastID, { httpOnly: false });
          return res.json({ ok: true, userId: this.lastID });
        });
      }
    });
  });

  // BUSCAR USUÁRIO logado
  server.get('/api/me', (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.json(null);
    db.get('SELECT id, name, email, phone FROM users WHERE id=?', [userId], (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(row || null);
    });
  });

  // LISTAR EVENTOS por dia/sala
  server.get('/api/events', (req, res) => {
    const { room, date } = req.query;
    if (!room || !date) return res.status(400).json({ error: 'room e date são obrigatórios' });

    const dayStart = new Date(`${date}T00:00:00.000Z`).toISOString();
    const dayEnd   = new Date(`${date}T23:59:59.999Z`).toISOString();

    db.all(
      `SELECT e.*, u.name as userName, u.phone as userPhone, u.email as userEmail
       FROM events e
       JOIN users u ON e.userId = u.id
       WHERE room = ?
         AND start >= ?
         AND end   <= ?
       ORDER BY start ASC`,
      [room, dayStart, dayEnd],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows || []);
      }
    );
  });

  // CRIAR EVENTO
  server.post('/api/events', (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: 'não autenticado' });

    const { room, title, start, end } = req.body || {};
    if (!room || !title || !start || !end) {
      return res.status(400).json({ error: 'room, title, start, end são obrigatórios' });
    }
    if (!is30MinStep(start) || !is30MinStep(end)) {
      return res.status(400).json({ error: 'Os horários devem estar em intervalos de 30 minutos.' });
    }
    const s = new Date(start).toISOString();
    const e = new Date(end).toISOString();
    if (s >= e) return res.status(400).json({ error: 'end deve ser depois de start' });

    // checar conflito
    db.all(
      'SELECT id, start, end FROM events WHERE room=?',
      [room],
      async (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });

        const hasConflict = (rows || []).some(r => overlaps(s, e, r.start, r.end));
        if (hasConflict) return res.status(409).json({ error: 'Conflito: horário já reservado.' });

        // inserir
        db.run(
          'INSERT INTO events (room, title, start, end, userId) VALUES (?,?,?,?,?)',
          [room, title, s, e, userId],
          function (e2) {
            if (e2) return res.status(500).json({ error: 'DB error' });

            // buscar user e notificar n8n
            db.get('SELECT * FROM users WHERE id=?', [userId], async (e3, user) => {
              if (!e3 && user) {
                await notifyN8n(
                  { id: this.lastID, room, title, start: s, end: e },
                  user
                );
              }
              return res.status(201).json({ id: this.lastID, room, title, start: s, end: e });
            });
          }
        );
      }
    );
  });

  // APAGAR EVENTO (opcional)
  server.delete('/api/events/:id', (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: 'não autenticado' });

    db.run('DELETE FROM events WHERE id=? AND userId=?', [req.params.id, userId], function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'não encontrado' });
      res.sendStatus(204);
    });
  });

  // Next como fallback
  server.all('*', (req, res) => handle(req, res));

  server.listen(PORT, () => {
    console.log(`✅ Pronto em http://localhost:${PORT}`);
  });
});
