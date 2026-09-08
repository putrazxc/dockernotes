# Stage 1: Build Frontend (Vue)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Backend
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./

# Copy compiled frontend from Stage 1 to backend/dist
COPY --from=frontend-builder /app/backend/dist ./dist

# Start server
EXPOSE 3000
CMD ["node", "server.js"]
