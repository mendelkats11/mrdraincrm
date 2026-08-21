// Minimal CSV serialization for report exports — docs/PROJECT_SPEC.md §22.
// RFC 4180 quoting: a field is quoted whenever it contains a comma,
// double-quote, or newline, with internal double-quotes doubled.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function escapeCsvField(raw: string | number): string {
  const value = String(raw);
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeCsvField(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvField(c.value(row))).join(","));
  }
  // Trailing CRLF per RFC 4180; also avoids some spreadsheet apps
  // misreading the final row when a file has no trailing newline.
  return lines.join("\r\n") + "\r\n";
}
