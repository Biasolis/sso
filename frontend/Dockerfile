# --- Estágio 1: Construir a Aplicação React ---
FROM node:18-alpine AS build

WORKDIR /app

# Copia os ficheiros de dependências e instala-as
COPY package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Constrói a aplicação para produção
RUN npm run build

# --- Estágio 2: Servir com Nginx ---
FROM nginx:stable-alpine

# Copia os ficheiros estáticos construídos do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx
# Esta configuração é crucial para que o React Router funcione corretamente
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]