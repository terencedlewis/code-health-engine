import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { ConfigOptions } from "../config";
import { GitAgeItem, GitHotspot } from "./index";

const execFileAsync = promisify(execFile);

async function isGitRepo(rootDir: string): Promise<boolean> {
  try {
    await fs.promises.access(path.join(rootDir, ".git"), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getAllTrackedFiles(rootDir: string): Promise<string[]> {
  const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: rootDir });
  return stdout
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);
}

async function getLastCommitDate(
  rootDir: string,
  file: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%ad", "--date=short", "--", file],
      { cwd: rootDir }
    );
    const date = stdout.trim();
    return date.length > 0 ? date : null;
  } catch {
    return null;
  }
}

async function getCommitCount(rootDir: string, file: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--oneline", "--follow", "--", file],
      { cwd: rootDir }
    );
    return stdout.trim().split("\n").filter((l) => l.length > 0).length;
  } catch {
    return 0;
  }
}

export async function scanGitAge(
  rootDir: string,
  config: ConfigOptions
): Promise<{ staleFiles: GitAgeItem[]; hotspots: GitHotspot[] }> {
  if (!(await isGitRepo(rootDir))) {
    throw new Error("Not a git repository — skipping git age analysis");
  }

  const trackedFiles = await getAllTrackedFiles(rootDir);

  // Filter out ignored paths
  const filtered = trackedFiles.filter((f) => {
    const parts = f.split("/");
    return !parts.some((p) => config.ignorePaths.includes(p));
  });

  const now = Date.now();
  const staleCutoff = config.staleFileDays * 24 * 60 * 60 * 1000;

  // Process files in parallel batches of 20 to avoid spawning too many processes
  const BATCH_SIZE = 20;
  const staleFiles: GitAgeItem[] = [];
  const hotspots: GitHotspot[] = [];

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (file) => {
        const [lastDateStr, commitCount] = await Promise.all([
          getLastCommitDate(rootDir, file),
          getCommitCount(rootDir, file),
        ]);
        return { file, lastDateStr, commitCount };
      })
    );

    for (const { file, lastDateStr, commitCount } of results) {
      if (lastDateStr) {
        const lastModifiedMs = new Date(lastDateStr).getTime();
        const daysSince = Math.floor((now - lastModifiedMs) / (24 * 60 * 60 * 1000));

        if (daysSince >= config.staleFileDays) {
          staleFiles.push({
            file,
            lastModified: lastDateStr,
            daysSince,
          });
        }
      }

      if (commitCount >= config.hotspotMinCommits) {
        hotspots.push({ file, commitCount });
      }
    }
  }

  staleFiles.sort((a, b) => b.daysSince - a.daysSince);
  hotspots.sort((a, b) => b.commitCount - a.commitCount);

  return { staleFiles, hotspots };
}
