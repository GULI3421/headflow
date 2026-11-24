import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

config({ path: [".env.local", ".env"] });

function readHidden(prompt: string) {
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY || !input.setRawMode) {
    throw new Error("Run this command in an interactive terminal so the password can be entered privately.");
  }

  return new Promise<string>((resolve, reject) => {
    let value = "";
    output.write(prompt);
    input.setRawMode(true);
    input.resume();

    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      output.write("\n");
    };

    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = Array.from(value).slice(0, -1).join("");
        } else if (char >= " ") {
          value += char;
        }
      }
    };

    input.on("data", onData);
  });
}

async function setLocalEnv(key: string, value: string) {
  const path = resolve(".env.local");
  const current = await readFile(path, "utf8").catch(() => "");
  const lines = current.split(/\r?\n/).filter((line) => !new RegExp(`^\\s*${key}\\s*=`).test(line));
  while (lines.length > 0 && !lines.at(-1)) lines.pop();
  lines.push(`${key}=${JSON.stringify(value)}`);
  await writeFile(path, `${lines.join("\n")}\n`, { mode: 0o600 });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@heatflow.kg").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }

  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    databaseUrl = await readHidden("Paste the rotated MongoDB Atlas URI (input hidden): ");
    const parsedUrl = new URL(databaseUrl);
    if (parsedUrl.protocol !== "mongodb+srv:" || !parsedUrl.hostname || !parsedUrl.pathname.slice(1)) {
      throw new Error("Enter a valid mongodb+srv URI that includes the database name.");
    }
    await setLocalEnv("DATABASE_URL", databaseUrl);
    process.env.DATABASE_URL = databaseUrl;
  }
  await setLocalEnv("ADMIN_EMAIL", email);

  const password = await readHidden(`New password for ${email}: `);
  const confirmation = await readHidden("Confirm password: ");
  if (password.length < 12) throw new Error("Use a password with at least 12 characters.");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  const passwordHash = await hash(password, 12);
  execFileSync("npm", ["run", "db:push"], { stdio: "inherit", env: process.env });
  const prisma = new PrismaClient();

  try {
    const user = await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
      select: { id: true, email: true },
    });

    await prisma.adminSession.deleteMany({ where: { userId: user.id } });
    console.log(`Administrator ${user.email} created or updated. Existing sessions were revoked.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Administrator setup failed.";
  console.error(message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[MongoDB URI hidden]"));
  process.exitCode = 1;
});
