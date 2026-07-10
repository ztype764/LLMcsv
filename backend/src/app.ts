import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import routes from './routes';

// Load environment variables (from local dir, falling back to parent dir)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();

// Enable CORS from Next.js development and production origins
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use(routes);
app.use('/api/backend', routes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
