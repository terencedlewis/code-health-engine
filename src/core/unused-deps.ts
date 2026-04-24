import * as path from "path";
import * as fs from "fs";
import { ConfigOptions } from "../config";

// depcheck has no TS types bundled; use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const depcheck = require("depcheck");

// Session-level cache: rootDir → unused dep list
const cache = new Map<string, string[]>();

export async function scanUnusedDeps(
  rootDir: string,
  config: ConfigOptions
): Promise<string[]> {
  // Verify package.json exists before running depcheck
  const pkgPath = path.join(rootDir, "package.json");
  try {
    await fs.promises.access(pkgPath, fs.constants.R_OK);
  } catch {
    throw new Error("No readable package.json found — skipping unused dep scan");
  }

  const cacheKey = rootDir;
  if (config.depcheckCache && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const options = {
    ignoreBinPackage: false,
    skipMissing: false,
    ignorePatterns: config.ignorePaths,
    ignoreMatches: config.ignoreDeps,
  };

  const result = await new Promise<{ dependencies: string[]; devDependencies: string[] }>(
    (resolve, reject) => {
      depcheck(rootDir, options, (res: { dependencies: string[]; devDependencies: string[] }) => {
        if (!res) reject(new Error("depcheck returned no result"));
        else resolve(res);
      });
    }
  );

  const unused = [
    ...result.dependencies,
    ...result.devDependencies,
  ].filter((dep) => !config.ignoreDeps.includes(dep));

  if (config.depcheckCache) {
    cache.set(cacheKey, unused);
  }

  return unused;
}
