import { InstagramBot } from "../automation/instagramBot";

function getCreds() {
  const envUser = process.env.IG_USERNAME;
  const envPass = process.env.IG_PASSWORD;
  let username = envUser;
  let password = envPass;

  // Accept CLI args: node script.ts <username> <password> OR --username= --password=
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--username=")) username = arg.split("=")[1];
    if (arg.startsWith("--password=")) password = arg.split("=")[1];
  }
  if (!username && args[0] && !args[0].startsWith("--")) username = args[0];
  if (!password && args[1] && !args[1].startsWith("--")) password = args[1];

  return { username, password };
}

async function main() {
  const { username, password } = getCreds();

  if (!username || !password) {
    console.error("IG_USERNAME and IG_PASSWORD environment variables are required, or pass <username> <password> as arguments");
    process.exit(1);
  }

  console.log(`Starting Instagram login test for ${username} ...`);

  const bot = new InstagramBot({ username, password });

  try {
    await bot.initialize();

    // Navigate to Instagram home and check login; if not logged in, perform login
    try {
      // @ts-ignore private access (intentional for test script)
      await bot.login();
    } catch (e) {
      console.log("Login attempt finished with message:", (e as Error)?.message || e);
    }

    // After login, verify status by going to home and checking markers
    // @ts-ignore access page for a quick check
    await bot["page"].goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
    // @ts-ignore private check
    const loggedIn = await bot.checkLoginStatus();

    if (loggedIn) {
      console.log("✅ Login successful. Session persisted under chromium_profiles/", username);
      process.exitCode = 0;
    } else {
      console.log("❌ Login not confirmed. Check credentials or potential verification challenges.");
      process.exitCode = 2;
    }
  } catch (error) {
    console.error("Error during Instagram login test:", (error as Error)?.message || error);
    process.exitCode = 1;
  } finally {
    await bot.close();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
