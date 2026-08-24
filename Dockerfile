# node:22 — 20 left LTS maintenance, so its Alpine base stops picking up
# openssl fixes while the image keeps building fine.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

ARG GIT_SHA=dev
ENV NEXT_PUBLIC_GIT_SHA=$GIT_SHA

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# npm is not used at runtime — `output: standalone` bundles everything
# server.js needs, and the entrypoint is plain node. It stays in the image only
# because the base ships it, and it brought 18 HIGH/CRITICAL CVEs of its own
# (tar, minimatch, glob, cross-spawn, sigstore) into a layer nothing executes.
#
# apk upgrade on the same line: the base tag is rebuilt on its own schedule, so
# libssl3 can sit one patch behind for weeks after the fix is published.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && apk upgrade --no-cache

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
