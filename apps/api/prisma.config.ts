import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: 'src/infra/db/prisma/schema.prisma',
  migrations: {
    // Prisma Migrate needs the DB URL here now
    path: "src/infra/db/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
