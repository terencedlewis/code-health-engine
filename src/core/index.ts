import { scanTodos } from "./todos";
import { scanLargeFiles } from "./large-files";
import { scanUnusedDeps } from "./unused-deps";
import { scanGitAge } from "./git-age";
import { ConfigOptions } from "../config";

export interface TodoItem {
  file: string;
  line: number;
  text: string;
  tag: string;
}

export interface LargeFileItem {
  file: string;
  lines: number;
}

export interface GitAgeItem {
  file: string;
  lastModified: string; // ISO date string
  daysSince: number;
}

export interface GitHotspot {
  file: string;
  commitCount: number;
}

export interface ScanWarning {
  scanner: string;
  message: string;
  error?: string;
}

export interface ScanResult {
  todos: TodoItem[];
  largeFiles: LargeFileItem[];
  unusedDeps: string[];
  staleFiles: GitAgeItem[];
  hotspots: GitHotspot[];
  warnings: ScanWarning[];
  meta: {
    scannedAt: string;
    rootDir: string;
  };
}

type SafeResult<T> = { data: T; warning?: ScanWarning };

async function safeRun<T>(
  scanner: string,
  emptyValue: T,
  fn: () => Promise<T>
): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: emptyValue,
      warning: { scanner, message: `Scanner failed: ${message}`, error: message },
    };
  }
}

export async function orchestrateScan(
  rootDir: string,
  config: ConfigOptions
): Promise<ScanResult> {
  const [todosResult, largeFilesResult, unusedDepsResult, gitAgeResult] =
    await Promise.all([
      safeRun("todos", [] as TodoItem[], () => scanTodos(rootDir, config)),
      safeRun("large-files", [] as LargeFileItem[], () => scanLargeFiles(rootDir, config)),
      safeRun("unused-deps", [] as string[], () => scanUnusedDeps(rootDir, config)),
      safeRun("git-age", { staleFiles: [] as GitAgeItem[], hotspots: [] as GitHotspot[] }, () =>
        scanGitAge(rootDir, config)
      ),
    ]);

  const warnings: ScanWarning[] = [
    todosResult.warning,
    largeFilesResult.warning,
    unusedDepsResult.warning,
    gitAgeResult.warning,
  ].filter((w): w is ScanWarning => w !== undefined);

  return {
    todos: todosResult.data,
    largeFiles: largeFilesResult.data,
    unusedDeps: unusedDepsResult.data,
    staleFiles: gitAgeResult.data.staleFiles,
    hotspots: gitAgeResult.data.hotspots,
    warnings,
    meta: {
      scannedAt: new Date().toISOString(),
      rootDir,
    },
  };
}
