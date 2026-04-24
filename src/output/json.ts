import { ScanResult } from "../core/index";

export function renderJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
