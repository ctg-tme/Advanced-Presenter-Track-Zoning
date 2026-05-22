import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const envPath = resolve(".env.local");
const outputPath = resolve("src/local-env.js");

function parseEnv(contents) {
  const values = {};

  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  });

  return values;
}

const envValues = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};
const appKey = envValues.APTABASE_API_KEY || "";
const output = `export const LOCAL_APTABASE_APP_KEY = ${JSON.stringify(appKey)};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output);

if (!appKey) {
  console.warn(
    "No APTABASE_API_KEY found in .env.local; local analytics will stay disabled."
  );
}
