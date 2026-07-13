# Container image for the GAD Corner website + CMS.
# Works on Fly.io, Railway, Render (Docker), Google Cloud Run, etc.
FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
