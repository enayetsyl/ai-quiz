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
# Install all dependencies (including dev) for build
RUN npm ci

# Copy entrypoint script early for better caching
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY . .

RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm ci --omit=dev && rm -rf /root/.npm

EXPOSE 4080

# Allow CMD to be overridden via build arg for different services
ARG CMD_OVERRIDE="node dist/server.js"
ENV CMD_OVERRIDE=${CMD_OVERRIDE}

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]


