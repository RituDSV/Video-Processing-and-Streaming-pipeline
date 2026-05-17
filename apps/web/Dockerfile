# ---- builder ----
    FROM node:22-alpine AS builder

    WORKDIR /app
    
    # copy root workspace manifest and base tsconfig
    COPY package*.json ./
    COPY tsconfig.base.json ./
    
    # copy shared packages (if web uses any)
    COPY packages/config ./packages/config
    COPY packages/shared ./packages/shared
    
    # copy web app
    COPY apps/web ./apps/web
    
    # install all dependencies from root
    RUN npm install
    
    # build Next.js app
    RUN npm run build --workspace=apps/web
    
    # ---- runtime ----
    FROM node:22-alpine
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/apps/web/.next ./apps/web/.next
    COPY --from=builder /app/apps/web/public ./apps/web/public
    COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
    COPY --from=builder /app/apps/web/next.config.ts ./apps/web/next.config.ts
    
    EXPOSE 3000
    
    CMD ["npm", "run", "start", "--workspace=apps/web"]