import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, CAPACITOR_BUILD: "true", GITHUB_PAGES: "false" };

function run(cli, args) {
  const result = spawnSync(process.execPath, [resolve(root, cli), ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node_modules/next/dist/bin/next", ["build"]);

// Reject broken exports before Capacitor can replace the phone's web assets.
const html = readFileSync(resolve(root, "out/index.html"), "utf8");
const assets = [...html.matchAll(/(?:href|src)="([^"\s]+)"/g)]
  .map((match) => match[1])
  .filter((url) => url.includes("/_next/"));
if (!assets.some((url) => url.endsWith(".css"))) {
  throw new Error("Android export is missing its stylesheet.");
}
for (const url of assets) {
  if (!url.startsWith("/_next/") || !existsSync(resolve(root, "out", url.slice(1)))) {
    throw new Error(`Android export references a missing asset: ${url}`);
  }
}

run("node_modules/@capacitor/cli/bin/capacitor", ["sync", "android"]);
