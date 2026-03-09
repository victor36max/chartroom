import { defineConfig } from "vitest/config";
import path from "path";

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "jsdom",
          exclude: ["src/lib/db/*.test.ts", "node_modules"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "db",
          environment: "node",
          include: ["src/lib/db/*.test.ts"],
          setupFiles: ["src/lib/db/vitest.setup.ts"],
          pool: "forks",
          testTimeout: 15000,
        },
        resolve: { alias },
        define: {
          MIGRATIONS_PATH: JSON.stringify(
            path.resolve(__dirname, "./supabase/migrations")
          ),
        },
      },
    ],
  },
});
