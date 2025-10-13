
# Agendamentos CRIO — Front + Backend + n8n

Projeto completo com:
- Frontend Next.js: /login e /calendario (slots de 30 minutos, 24h)
- Backend Express + SQLite: /api/users e /api/bookings
- Integração com n8n via Webhook (confirmação de agendamento)

## Como rodar

1) Instale dependências:
```bash
npm install
```

2) Suba o backend (porta 4000):
```bash
npm run api
```

3) Em outro terminal, suba o frontend (porta 3000):
```bash
npm run dev
```

4) Acesse:
- Login: http://localhost:3000/login
- Calendário (após login): http://localhost:3000/calendario

## Configurar n8n

- Abra seu n8n local: http://localhost:5678
- Crie um Workflow com **Webhook** em: `/webhook/confirmacao`
- Do Webhook, envie a mensagem pelo WhatsApp (via WhatsApp Cloud API) ou e-mail.
- Se o seu webhook tiver outra URL, defina a variável de ambiente ao iniciar a API:
```bash
$env:N8N_WEBHOOK_URL="http://SEU_HOST/webhook/confirmacao"; npm run api   # PowerShell
# ou
N8N_WEBHOOK_URL="http://SEU_HOST/webhook/confirmacao" npm run api         # Linux/Mac
```

O payload que o n8n recebe é:
```json
{
  "bookingId": 123,
  "user": { "id": 1, "nome": "Fulano", "email": "x@x.com", "whatsapp": "55DDDNUMERO" },
  "data": "2025-10-02",
  "hora_inicio": "09:00",
  "hora_fim": "09:30"
}
```

Com isso, no n8n você consegue montar a mensagem:
```
Olá {{$json.user.nome}}, sua reserva foi confirmada!
📅 {{$json.data}}
⏰ {{$json.hora_inicio}} - {{$json.hora_fim}}
Equipe CRIO
```

## Observações

- O banco `database.db` é criado automaticamente no primeiro run (SQLite).
- Os horários são gerados em blocos de 30 minutos (00:00–23:30).
- A verificação de conflito é simples; pode ser melhorada conforme necessidade (por sala, etc.).
- Para embutir um chat Tawk.to, edite `pages/_document.js` e troque `SEU_PROPERTY_ID`.
