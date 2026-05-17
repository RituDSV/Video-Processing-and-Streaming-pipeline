# ---- builder ----
    FROM node:22-alpine AS builder

    WORKDIR /app
    
    # copy root workspace manifest and base tsconfig
    COPY package*.json ./
    COPY tsconfig.base.json ./
    
    # copy shared packages
    COPY packages/config ./packages/config
    COPY packages/shared ./packages/shared
    
    # copy prisma schema
    COPY apps/api/src/infra/db/prisma ./apps/api/src/infra/db/prisma
    
    # copy worker app
    COPY apps/worker ./apps/worker
    
    # install all dependencies from root (resolves local packages)
    RUN npm install
    
    # generate prisma client BEFORE any builds
    RUN npm exec --workspace=apps/worker prisma generate -- --schema=/app/apps/api/src/infra/db/prisma/schema.prisma
    
    # build shared packages first so their dist/ exists before app build
    RUN npm run build --workspace=packages/config
    RUN npm run build --workspace=packages/shared
    
    # install nest cli explicitly (not declared in package.json, needed for build)
    RUN npm install -g @nestjs/cli
    
    # build
    RUN npm run build --workspace=apps/worker
    
    # ---- runtime ----
    FROM node:22-alpine
    RUN apk add --no-cache ffmpeg
    
    WORKDIR /app
    
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
    COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    
    CMD ["node", "apps/worker/dist/main.js"]