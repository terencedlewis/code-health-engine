import * as fs from "fs";
import * as path from "path";
import { ConfigOptions } from "../config";
import { TodoItem } from "./index";

const TODO_REGEX = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/gi;

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

export async function scanTodos(
  rootDir: string,
  config: ConfigOptions
): Promise<TodoItem[]> {
  const files = await walkFiles(rootDir, config.ignorePaths);
  const todos: TodoItem[] = [];

  for (const filePath of files) {
    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch {
      continue;
    }

    if (isBinaryBuffer(buffer)) continue;

    const content = buffer.toString("utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      TODO_REGEX.lastIndex = 0;

      while ((match = TODO_REGEX.exec(line)) !== null) {
        todos.push({
          file: path.relative(rootDir, filePath),
          line: i + 1,
          tag: match[1].toUpperCase(),
          text: match[2].trim(),
        });
      }
    }
  }

  return todos;
}
