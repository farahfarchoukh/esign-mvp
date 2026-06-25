# syntax=docker/dockerfile:1
FROM node:20-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Install OpenSSL — Prisma's query engine needs it at runtime on slim images.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy only the files needed for `npm ci` first, so the install layer is cached.
# `npm ci` runs the postinstall script (prisma generate + copy pdf.js worker),
# which is why prisma/ and scripts/ must be present before install.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts

# Dev deps (next, prisma, typescript, tailwind) are required for `next build`,
# so install everything despite NODE_ENV=production.
RUN npm ci --include=dev

# Copy the rest of the application source.
COPY . .

# Create the SQLite database from the schema, then build the Next.js app.
RUN npx prisma db push --skip-generate \
  && npm run build

EXPOSE 3000

# Entry point: ensure the DB schema exists (idempotent), then start the server.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
