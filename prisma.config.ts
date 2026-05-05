import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Allow prisma generate to run during CI/Vercel install even when
    // DATABASE_URL isn't configured yet in project environment settings.
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public",
  },
});
