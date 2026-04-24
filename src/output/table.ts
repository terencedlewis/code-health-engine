import Table from "cli-table3";
import chalk from "chalk";
import { ScanResult } from "../core/index";

function makeTable(head: string[]): InstanceType<typeof Table> {
  return new Table({
    head: head.map((h) => chalk.bold.cyan(h)),
    style: { border: ["grey"] },
  });
}

function sectionHeader(title: string, count: number): string {
  const countStr = count > 0 ? chalk.yellow(` (${count})`) : chalk.green(" (0)");
  return `\n${chalk.bold.white(title)}${countStr}`;
}

export function renderTable(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(
    chalk.bold.magenta("\n╔══════════════════════════════╗"),
    chalk.bold.magenta("║   Code Health Report         ║"),
    chalk.bold.magenta("╚══════════════════════════════╝"),
    chalk.dim(`  Scanned: ${result.meta.rootDir}`),
    chalk.dim(`  At:      ${result.meta.scannedAt}`)
  );

  // TODOs
  lines.push(sectionHeader("TODO / FIXME / HACK / XXX", result.todos.length));
  if (result.todos.length === 0) {
    lines.push(chalk.green("  No action items found."));
  } else {
    const table = makeTable(["Tag", "File", "Line", "Text"]);
    for (const item of result.todos) {
      const tagColor =
        item.tag === "FIXME"
          ? chalk.red(item.tag)
          : item.tag === "HACK"
          ? chalk.yellow(item.tag)
          : chalk.blue(item.tag);
      table.push([tagColor, item.file, String(item.line), item.text.slice(0, 80)]);
    }
    lines.push(table.toString());
  }

  // Large files
  lines.push(sectionHeader("Large Files", result.largeFiles.length));
  if (result.largeFiles.length === 0) {
    lines.push(chalk.green("  No large files found."));
  } else {
    const table = makeTable(["File", "Lines"]);
    for (const item of result.largeFiles) {
      table.push([item.file, chalk.yellow(String(item.lines))]);
    }
    lines.push(table.toString());
  }

  // Unused deps
  lines.push(sectionHeader("Unused Dependencies", result.unusedDeps.length));
  if (result.unusedDeps.length === 0) {
    lines.push(chalk.green("  No unused dependencies detected."));
  } else {
    const table = makeTable(["Package"]);
    for (const dep of result.unusedDeps) {
      table.push([chalk.red(dep)]);
    }
    lines.push(table.toString());
    lines.push(chalk.dim("  ⚠  Results are heuristic-based. Dynamic imports may cause false positives."));
  }

  // Stale files
  lines.push(sectionHeader("Stale Files (untouched 2+ years)", result.staleFiles.length));
  if (result.staleFiles.length === 0) {
    lines.push(chalk.green("  No stale files found."));
  } else {
    const table = makeTable(["File", "Last Modified", "Days Ago"]);
    for (const item of result.staleFiles) {
      table.push([item.file, item.lastModified, chalk.red(String(item.daysSince))]);
    }
    lines.push(table.toString());
  }

  // Hotspots
  lines.push(sectionHeader("Hotspots (frequently changed)", result.hotspots.length));
  if (result.hotspots.length === 0) {
    lines.push(chalk.green("  No hotspots found."));
  } else {
    const table = makeTable(["File", "Commits"]);
    for (const item of result.hotspots) {
      table.push([item.file, chalk.yellow(String(item.commitCount))]);
    }
    lines.push(table.toString());
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push(`\n${chalk.bold.yellow("Warnings")}`);
    for (const w of result.warnings) {
      lines.push(chalk.yellow(`  [${w.scanner}] ${w.message}`));
    }
  }

  lines.push("");
  return lines.join("\n");
}
