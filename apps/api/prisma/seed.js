const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding app_settings row (id=1) if missing...");
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  console.log("Seeding class levels 6-10 if missing...");
  const classLevels = [
    { id: 6, displayName: "Class 6" },
    { id: 7, displayName: "Class 7" },
    { id: 8, displayName: "Class 8" },
    { id: 9, displayName: "Class 9" },
    { id: 10, displayName: "Class 10" },
  ];
  for (const cls of classLevels) {
    await prisma.classLevel.upsert({
      where: { id: cls.id },
      update: { displayName: cls.displayName },
      create: { id: cls.id, displayName: cls.displayName },
    });
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
