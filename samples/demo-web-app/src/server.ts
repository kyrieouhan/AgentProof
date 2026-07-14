import { buildApp } from "./app";
import { prisma } from "./db";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const app = buildApp();

async function main() {
  await app.listen({ port, host });
  console.log(`Demo web app listening on http://${host}:${port}`);
}

main().catch(async (error) => {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
