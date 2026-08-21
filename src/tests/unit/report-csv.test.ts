import { describe, expect, it } from "vitest";
import { rowsToCsv } from "@/lib/reports/csv";

interface Row {
  name: string;
  amount: number;
}

describe("rowsToCsv", () => {
  it("writes a header row and one row per input", () => {
    const csv = rowsToCsv<Row>(
      [
        { name: "Alice", amount: 100 },
        { name: "Bob", amount: 250 },
      ],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Amount", value: (r) => r.amount },
      ],
    );
    expect(csv).toBe("Name,Amount\r\nAlice,100\r\nBob,250\r\n");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Smith, "The Plumber"\nInc', amount: 0 }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Amount", value: (r) => r.amount },
      ],
    );
    expect(csv).toBe('Name,Amount\r\n"Smith, ""The Plumber""\nInc",0\r\n');
  });

  it("produces just a header row for an empty dataset", () => {
    const csv = rowsToCsv<Row>([], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toBe("Name\r\n");
  });
});
