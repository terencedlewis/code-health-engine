import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { mergeConfig } from "./config";
import { orchestrateScan } from "./core/index";
import { renderTable } from "./output/table";
import { renderJson } from "./output/json";

const program = new Command();

program
  .name("code-health")
  .description("Project intelligence engine — actionable health insights for your codebase")
  .version("1.0.0");

program
  .command("scan <dir>")
  .description("Scan a directory for code health issues")
  .option("-f, --format <format>", "Output format: table or json", "table")
  .option("-m, --max-lines <n>", "Lines threshold for large file detection", "500")
  .option("-s, --stale-days <n>", "Days threshold for stale file detection", "730")
  .option(
    "-i, --ignore-deps <packages>",
    "Comma-separated list of dependency names to ignore in unused-dep scan",
    ""
  )
  .action(async (dir: string, options: { format: string; maxLines: string; staleDays: string; ignoreDeps: string }) => {
    const resolvedDir = path.resolve(dir);

    // Validate directory exists
    try {
      const stat = await fs.promises.stat(resolvedDir);
      if (!stat.isDirectory()) {
        console.error(`Error: "${resolvedDir}" is not a directory.`);
        process.exit(1);
      }
    } catch {
      console.error(`Error: Directory "${resolvedDir}" does not exist or is not accessible.`);
      process.exit(1);
    }

    const format = options.format === "json" ? "json" : "table";
    const maxLines = Math.max(1, parseInt(options.maxLines, 10) || 500);
    const staleDays = Math.max(1, parseInt(options.staleDays, 10) || 730);
    const ignoreDeps = options.ignoreDeps
      ? options.ignoreDeps.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const config = mergeConfig({ largeFileLines: maxLines, staleFileDays: staleDays, ignoreDeps });

    try {
      const result = await orchestrateScan(resolvedDir, config);

      if (format === "json") {
        console.log(renderJson(result));
      } else {
        console.log(renderTable(result));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Fatal scan error: ${message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
