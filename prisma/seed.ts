import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const hash = await bcrypt.hash(password, 10);

  await prisma.event.upsert({
    where: { slug: "demo-wedding" },
    create: {
      slug: "demo-wedding",
      title: "Демо-свадьба",
      adminPasswordHash: hash,
    },
    update: {
      title: "Демо-свадьба",
      adminPasswordHash: hash,
    },
  });

  console.log("Seed OK: event demo-wedding, admin password:", password);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
