import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "@spendlens/shared";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo user for development
  const user = await prisma.user.upsert({
    where: { email: "demo@spendlens.dev" },
    update: {},
    create: {
      email: "demo@spendlens.dev",
      // Password: "password123" (bcrypt hash, 10 rounds)
      hashedPassword:
        "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36mQGy0ODxhO0OaStqKFlGq",
      name: "Demo User",
      settings: {
        create: {
          weekStartDay: 1,
          currency: "USD",
        },
      },
    },
  });

  // Seed default categories for the demo user
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i];
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: cat.name,
        },
      },
      update: {},
      create: {
        userId: user.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isDefault: true,
        sortOrder: i,
      },
    });
  }

  console.log(`Seeded user: ${user.email} with ${DEFAULT_CATEGORIES.length} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
