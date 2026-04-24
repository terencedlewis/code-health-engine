export interface ConfigOptions {
  largeFileLines: number;
  staleFileDays: number;
  hotspotMinCommits: number;
  ignorePaths: string[];
  ignoreDeps: string[];
  depcheckCache: boolean;
}

export const defaultConfig: ConfigOptions = {
  largeFileLines: 500,
  staleFileDays: 730,
  hotspotMinCommits: 20,
  ignorePaths: [
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "coverage",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
  ],
  ignoreDeps: [],
  depcheckCache: true,
};

export function mergeConfig(overrides: Partial<ConfigOptions>): ConfigOptions {
  return { ...defaultConfig, ...overrides };
}
