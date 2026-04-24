import * as fs from "fs";
import * as path from "path";
import { ConfigOptions } from "../config";
import { LargeFileItem } from "./index";

const BINARY_CHECK_BYTES = 8192;

function isBinaryBuffer(buffer: Buffer): boolean {
  const len = Math.min(buffer.length, BINARY_CHECK_BYTES);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

async function walkFiles(
  dir: string,
  ignorePaths: string[]
): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignorePaths.includes(entry.name)) continue;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

export async function scanLargeFiles(
  rootDir: string,
  config: ConfigOptions
): Promise<LargeFileItem[]> {
  const files = await walkFiles(rootDir, config.ignorePaths);
  const largeFiles: LargeFileItem[] = [];

  for (const filePath of files) {
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch {
      continue;
    }

    if (isBinaryBuffer(buffer)) continue;

    const content = buffer.toString("utf8");
    let lineCount = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "\n") lineCount++;
    }
    // Account for files not ending with newline
    if (content.length > 0 && content[content.length - 1] !== "\n") {
      lineCount++;
    }

    if (lineCount > config.largeFileLines) {
      largeFiles.push({
        file: path.relative(rootDir, filePath),
        lines: lineCount,
      });
    }
  }

  largeFiles.sort((a, b) => b.lines - a.lines);
  return largeFiles;
}
