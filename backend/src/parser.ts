import { parse } from 'csv-parse';

export interface RawLeadRecord {
  [key: string]: string;
}

/**
 * Parses CSV buffer into array of key-value records.
 * Uses the first row as keys for the records.
 */
export function parseCsv(buffer: Buffer): Promise<RawLeadRecord[]> {
  return new Promise((resolve, reject) => {
    // Try to parse the CSV file content
    parse(
      buffer,
      {
        columns: true, // Treat first line as headers
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle UTF-8 Byte Order Mark
        relax_column_count: true, // Allow rows to have different column counts if messy
      },
      (err, records) => {
        if (err) {
          reject(err);
        } else {
          resolve(records as RawLeadRecord[]);
        }
      }
    );
  });
}
