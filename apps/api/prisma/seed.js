const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

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

  console.log("Seeding subjects and chapters for Class 6...");
  const class6Id = 6;
  const subjects = [
    { name: "Bangla", code: "BA" },
    { name: "English", code: "EN" },
    { name: "Math", code: "MA" },
  ];

  for (const subj of subjects) {
    // Create or update subject
    const subject = await prisma.subject.upsert({
      where: {
        classId_name: {
          classId: class6Id,
          name: subj.name,
        },
      },
      update: { code: subj.code },
      create: {
        name: subj.name,
        code: subj.code,
        classId: class6Id,
      },
    });

    console.log(`  ✓ Subject: ${subj.name} (${subj.code})`);

    // Create chapters for this subject (Chapter 1, 2, 3)
    for (let ordinal = 1; ordinal <= 3; ordinal++) {
      await prisma.chapter.upsert({
        where: {
          subjectId_ordinal: {
            subjectId: subject.id,
            ordinal: ordinal,
          },
        },
        update: { name: `Chapter ${ordinal}` },
        create: {
          name: `Chapter ${ordinal}`,
          ordinal: ordinal,
          subjectId: subject.id,
        },
      });
      console.log(`    ✓ Chapter ${ordinal}`);
    }
  }

  console.log("Seeding admin user if missing...");
  const adminEmail = "enayetflweb@gmail.com";
  const adminPassword = "Ab123456@";
  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      role: "admin",
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✓ Admin user seeded: ${adminEmail}`);

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
