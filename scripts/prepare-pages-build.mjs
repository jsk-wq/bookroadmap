import { rmSync } from "node:fs";

if (process.env.GITHUB_PAGES === "true") {
  rmSync("src/app/api", { recursive: true, force: true });
}
