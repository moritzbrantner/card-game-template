import { seedTestUsers, TEST_USERS } from "@/src/testing/test-users";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("Skipping test user seed because DATABASE_URL is not set.");
    return;
  }

  await seedTestUsers();

  console.log("Seeded test users:");
  for (const user of TEST_USERS) {
    console.log(`- ${user.email} / ${user.password}`);
  }
}

main().catch((error) => {
  console.error("Failed to seed test users", error);
  process.exit(1);
});
