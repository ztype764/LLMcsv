import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseCsv } from './parser';
import { mapBatchWithAi, ProcessingResult } from './ai';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Handle CSV upload and stream AI mappings via SSE.
 */
router.post('/api/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No CSV file uploaded' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in Nginx (if deployed behind Nginx)

  // Flush headers immediately
  res.flushHeaders();

  let rawRecords: any[] = [];
  try {
    rawRecords = await parseCsv(req.file.buffer);
    console.log(`Parsed CSV successfully. Found ${rawRecords.length} records.`);
  } catch (error: any) {
    console.error('CSV Parsing failed:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: `Failed to parse CSV: ${error.message}` })}\n\n`);
    res.end();
    return;
  }

  if (rawRecords.length === 0) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'The uploaded CSV file is empty' })}\n\n`);
    res.end();
    return;
  }

  const batchSize = 10;
  const totalRecords = rawRecords.length;
  let processedCount = 0;

  // Track if the client closed the connection early
  let isClientDisconnected = false;
  req.on('close', () => {
    isClientDisconnected = true;
    console.log('Client disconnected from SSE stream');
  });

  // Prepare batched inputs with row numbers (1-indexed, skipping header row)
  const batchedInputs = [];
  for (let i = 0; i < totalRecords; i += batchSize) {
    const chunk = rawRecords.slice(i, i + batchSize).map((record, index) => ({
      rowNumber: i + index + 2, // Row 1 is header, row 2 is first data row
      data: record,
    }));
    batchedInputs.push(chunk);
  }

  // Process batches sequentially and stream results
  for (let i = 0; i < batchedInputs.length; i++) {
    if (isClientDisconnected) {
      break;
    }

    const currentBatch = batchedInputs[i];
    console.log(`Processing batch ${i + 1}/${batchedInputs.length} (${currentBatch.length} records)...`);

    try {
      // Send batch to AI mapping function
      const results: ProcessingResult[] = await mapBatchWithAi(currentBatch);
      processedCount += currentBatch.length;

      // Stream the successful/skipped records back to the client
      res.write(
        `data: ${JSON.stringify({
          type: 'batch',
          records: results,
          progress: {
            current: processedCount,
            total: totalRecords,
            batchIndex: i + 1,
            totalBatches: batchedInputs.length,
          },
        })}\n\n`
      );
    } catch (error: any) {
      console.error(`Error processing batch ${i + 1}:`, error.message);
      // Even if AI mapping failed completely for a batch (e.g. rate limit after retries),
      // we mark them as skipped rather than breaking the entire stream so the user doesn't lose all progress.
      const fallbackResults: ProcessingResult[] = currentBatch.map((item) => ({
        status: 'skipped',
        skip_reason: `AI processing failed: ${error.message}`,
        data: { original_row: item.rowNumber, name: item.data.name || '' },
      }));
      processedCount += currentBatch.length;

      res.write(
        `data: ${JSON.stringify({
          type: 'batch',
          records: fallbackResults,
          progress: {
            current: processedCount,
            total: totalRecords,
            batchIndex: i + 1,
            totalBatches: batchedInputs.length,
          },
        })}\n\n`
      );
    }
  }

  // Send complete event
  if (!isClientDisconnected) {
    console.log('Finished streaming all records.');
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  }
});

/**
 * Health check or test route to see if API is up
 */
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

export default router;
