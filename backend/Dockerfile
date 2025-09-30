# Estágio 1: Instalar dependências
FROM node:18-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

# Estágio 2: Construir a aplicação
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Estágio 3: Produção
FROM node:18-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV production

COPY --from=builder /usr/src/app ./

EXPOSE 4000

CMD ["node", "src/server.js"]