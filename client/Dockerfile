# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Serve
FROM nginx:alpine

# Copiar build estático de la etapa 1 al directorio de NGINX
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Configuración por defecto de NGINX para SPA (Single Page Application)
# Necesario para React Router
RUN echo 'server { \
    listen 80; \
    location / { \
        root   /usr/share/nginx/html; \
        index  index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
