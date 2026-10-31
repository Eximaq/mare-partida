FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/game-server/package.json apps/game-server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --ignore-scripts
COPY apps/game-server apps/game-server
COPY packages/shared packages/shared
RUN npm run build

FROM node:24.15.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps/game-server/package.json apps/game-server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/apps/game-server/dist apps/game-server/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/game-server/migrations apps/game-server/migrations
USER node
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8787/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/game-server/dist/main.js"]
