import { hashPassword } from "../src/lib/password";
import { config } from "../src/config/config";
import { prisma } from "../src/config/prisma";

async function main() {
  const { email, password } = config.defaultAdmin;

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      password: await hashPassword(password),
      role: "ADMIN",
      walletAddress: "0x0000000000000000000000000000000000000000",
      privateKeyEncrypted: "",
    },
  });

  console.log(`Admin seeded: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
