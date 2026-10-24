import { defineConfig } from "orval";

export default defineConfig({
  oriole: {
    input: { target: process.env.ORVAL_API_URL ?? "http://127.0.0.1:8000/openapi.json" },
    output: {
      mode: "tags",
      target: "./src/lib/api/gen/",
      schemas: "./src/lib/api/gen/schemas",
      client: "fetch",
      baseUrl: "http://127.0.0.1:8000",
    },
  },
});