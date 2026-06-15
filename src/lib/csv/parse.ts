import Papa from "papaparse";
import type { CsvRow } from "@/types";

export function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
  const parsed = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    header: false,
  });

  if (!parsed.data.length) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = parsed.data;
  const headers = headerRow.map(normalizeHeader);

  const rows: CsvRow[] = dataRows.map((row) => {
    const obj: CsvRow = {};
    headers.forEach((key, i) => {
      if (key) obj[key] = cleanValue(row[i] ?? "");
    });
    return obj;
  });

  return { headers, rows };
}

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
}

function cleanValue(v: string): string {
  return v.replace(/^\uFEFF/, "").replace(/\r/g, "").replace(/^"|"$/g, "").trim();
}

export function csvBoolJson(v: string | undefined, fallback = "true"): string {
  const x = (v ?? fallback).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(x)) return "true";
  if (["0", "false", "no", "n"].includes(x)) return "false";
  return x;
}

export function rowsToCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          return val.includes(",") || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}
