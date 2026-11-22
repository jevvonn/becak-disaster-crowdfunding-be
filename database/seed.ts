import { hashPassword } from "../src/lib/password";
import { generateWallet } from "../src/lib/wallet";
import { config } from "../src/config/config";
import { prisma } from "../src/config/prisma";

async function main() {
  const { email, password } = config.defaultAdmin;
  const wallet = generateWallet();

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      password: await hashPassword(password),
      role: "ADMIN",
      walletAddress: wallet.address,
      privateKeyEncrypted: wallet.privateKeyEncrypted,
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
