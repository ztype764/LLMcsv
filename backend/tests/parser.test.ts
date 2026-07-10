import { parseCsv } from '../src/parser';

describe('CSV Parser Unit Tests', () => {
  it('should parse a valid CSV buffer successfully', async () => {
    const csvContent = `First Name,Last Name,Email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com`;
    const buffer = Buffer.from(csvContent);
    const records = await parseCsv(buffer);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      'First Name': 'John',
      'Last Name': 'Doe',
      Email: 'john@example.com',
    });
    expect(records[1]).toEqual({
      'First Name': 'Jane',
      'Last Name': 'Smith',
      Email: 'jane@example.com',
    });
  });

  it('should skip empty lines in the CSV file', async () => {
    const csvContent = `Name,Phone\n\nAlice,9876543210\n\nBob,8765432109\n\n`;
    const buffer = Buffer.from(csvContent);
    const records = await parseCsv(buffer);

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ Name: 'Alice', Phone: '9876543210' });
    expect(records[1]).toEqual({ Name: 'Bob', Phone: '8765432109' });
  });

  it('should handle messy layouts and column spacing', async () => {
    const csvContent = `  Full Name  ,  E-Mail  \n  Mark Z  ,  mark@meta.com  `;
    const buffer = Buffer.from(csvContent);
    const records = await parseCsv(buffer);

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ 'Full Name': 'Mark Z', 'E-Mail': 'mark@meta.com' });
  });
});
