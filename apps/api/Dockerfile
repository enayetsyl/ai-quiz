FROM node:20-bullseye-slim

# Install system deps for poppler and sharp
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      poppler-utils \
      libvips-dev \
      build-essential \
      python3 \
      make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

EXPOSE 4080

CMD ["node", "dist/server.js"]


