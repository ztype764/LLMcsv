import request from 'supertest';
import app from '../src/app';
import { mapBatchWithAi } from '../src/ai';

// Mock the AI module
jest.mock('../src/ai');

describe('Express API Route Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('POST /api/import', () => {
    it('should reject requests with no file payload', async () => {
      const res = await request(app).post('/api/import');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No CSV file uploaded');
    });

    it('should parse CSV file and stream batched results back via SSE', async () => {
      // Configure the mock implementation dynamically for this test
      (mapBatchWithAi as jest.Mock).mockImplementation(async (batch) => {
        return batch.map((item: any) => {
          const name = item.data['Lead Name'] || item.data['Name'] || '';
          const email = item.data['Email'] || '';
          const mobile = item.data['Phone'] || '';

          if (!email && !mobile) {
            return {
              status: 'skipped',
              skip_reason: 'Missing both email and mobile number',
              data: { original_row: item.rowNumber, name },
            };
          }

          return {
            status: 'success',
            skip_reason: null,
            data: {
              original_row: item.rowNumber,
              name,
              email,
              mobile_without_country_code: mobile,
              crm_status: 'GOOD_LEAD_FOLLOW_UP',
              created_at: new Date().toISOString(),
            },
          };
        });
      });

      const csvData = `Lead Name,Email,Phone\nAlice,alice@gmail.com,9876543210\nBob,,8765432109\nInvalid Record,,\n`;
      const buffer = Buffer.from(csvData);

      const res = await request(app)
        .post('/api/import')
        .attach('file', buffer, 'leads.csv');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/event-stream');

      const bodyText = res.text;
      
      // Verify SSE events are streamed back
      expect(bodyText).toContain('data:');
      expect(bodyText).toContain('"type":"batch"');
      expect(bodyText).toContain('"type":"complete"');

      // Check for records parsed and processed in chunk events
      expect(bodyText).toContain('Alice');
      expect(bodyText).toContain('Bob');
      expect(bodyText).toContain('Missing both email and mobile number');
    });
  });
});
