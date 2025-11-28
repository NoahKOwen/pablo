// server/scripts/resetAllDepositAddresses.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { deriveDepositAddress } from "../services/hdWallet";

const prisma = new PrismaClient();

async function resetAllDepositAddresses() {
  console.log("⚠️ WARNING: This will overwrite ALL users' depositAddress + derivationIndex");
  console.log("Make sure no real funds exist on old addresses before continuing.\n");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true },
    orderBy: { createdAt: "asc" },
  });

  let index = 0;

  for (const user of users) {
    try {
      const addr = deriveDepositAddress(index);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          derivationIndex: index,
          depositAddress: addr.toLowerCase(),
        },
      });

      console.log(
        `✅ ${user.username} (${user.email}) -> index ${index}, address ${addr}`
      );

      index++;
    } catch (err) {
      console.error(
        `❌ Failed for ${user.username} (${user.email}) at index ${index}:`,
        err
      );
    }
  }

  console.log("\n✨ Done.");
  console.log(`Last used index: ${index - 1}`);
}

resetAllDepositAddresses()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
