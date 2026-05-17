# ---- builder ----
    FROM node:22-alpine AS builder

    WORKDIR /app
    
    # copy root workspace manifest and base tsconfig
    COPY package*.json ./
    COPY tsconfig.base.json ./
    
    # copy shared packages
    COPY packages/config ./packages/config
    COPY packages/shared ./packages/shared
    
    # copy api app
    COPY apps/api ./apps/api
    
    # install all dependencies from root (resolves local packages)
    RUN npm install
    
    # generate prisma client before any builds
    RUN npx prisma generate --schema=./apps/api/src/infra/db/prisma/schema.prisma
    
    # build shared packages first so their dist/ exists before app build
    RUN npm run build --workspace=packages/config
    RUN npm run build --workspace=packages/shared
    
    # install nest cli explicitly (not declared in package.json, needed for build)
    RUN npm install -g @nestjs/cli
    
    # build
    RUN npm run build --workspace=apps/api
    
    # ---- runtime ----
    FROM node:22-alpine
    
    WORKDIR /app
    
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/apps/api/dist ./apps/api/dist
    COPY --from=builder /app/apps/api/src/infra/db/prisma ./apps/api/src/infra/db/prisma
    COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
    COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    
    EXPOSE 3000
    
    CMD ["node", "apps/api/dist/main.js"]