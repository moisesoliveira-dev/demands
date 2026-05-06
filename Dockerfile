# ─────────────── build ──────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# API_URL pode ser ajustado em build-time se houver environment.production.ts dependendo dele.
ARG API_URL=/api
ENV API_URL=$API_URL
RUN npm run build -- --configuration=production

# ────────────── runtime ─────────────
FROM nginx:1.27-alpine AS runtime
# Angular 17+ aplica hashes; servimos como SPA com fallback para index.html.
COPY --from=build /app/dist/demands/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
