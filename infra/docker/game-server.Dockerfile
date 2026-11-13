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
COPY attribute-rules.js inventory-batch.js bounty-system.js character-appearance.js boss-dungeon-system.js character-catalog.js character-system.js item-catalog.js forge-system.js prison-system.js haki-system.js haki-progression.js akuma-system.js neko-system.js ushi-system.js ushi-rules.js ushi-art-data.js doru-system.js doru-data.js wolf-system.js wolf-data.js akuma-passives.js rank-c-system.js rank-c-data.js rank-c-expansion.js rank-c-expansion-data.js rank-b-system.js rank-b-data.js hoya-system.js hoya-data.js combat-animation.js jiki-system.js jiki-data.js ryu-system.js ryu-data.js rank-a-system.js rank-a-data.js rank-a-expansion.js rank-s-system.js rank-s-data.js ./
COPY paramecia-rework-data.js paramecia-rework-manifest.js rank-s-rework-data.js rank-s-rework.js ./
COPY visual-completo.js ./
COPY akainu-combat.js weekly-boss-rules.cjs weekly-boss-battle.cjs ./
COPY server-navigation.cjs server-terrain-mask.cjs world-catalog.cjs island-world.js lobby-map-data.js lobby-world.js impel-down-world.js alabasta-map-data.js alabasta-world.js alubarna-map-data.js alubarna-world.js ember-world.js orange-world.js conchas-world.js dawn-map-data.js dawn-world.js rare-world.js new-islands-data.js new-islands-objects.js new-islands.js pixellab-world-maps-data.js conchas-pixellab-data.js conchas-structures.js pixellab-world-maps.js quest-dungeons-data.js quest-dungeons-world.js skypiea-map-data.js skypiea-world.js world-map-exports-data.js world-map-exports.js world-system.js archipelago.js ./
COPY boss-dungeon-combat.js dungeon-timing.cjs dungeon-boss-art-data.js party-rules.cjs party-battle.cjs ./
USER node
COPY combat-action-policy.js zoan-art.js fruit-runtime.cjs fruit-lower-runtime.cjs fruit-summon-runtime.cjs hierarchy-system.js talent-runtime.cjs talent-system.js talent-combat.js ultimate-system.js achievement-system.js contract-system.js world-battle.cjs hunt-system.js monster-behavior.js monster-catalog.js monster-game-catalog.js combat-vfx-data.js combat-vfx.js ./
EXPOSE 8787
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8787/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/game-server/dist/main.js"]
