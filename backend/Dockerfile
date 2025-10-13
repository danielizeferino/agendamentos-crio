FROM node:18-alpine

WORKDIR /app

# Dependências
COPY package*.json ./
RUN npm ci

# Prisma schema e código
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Compila TypeScript -> dist
RUN npm run build

# Porta
EXPOSE 3001

# Ao subir o container: aplica migrações e inicia API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
