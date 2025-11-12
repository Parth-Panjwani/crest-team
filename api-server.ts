// Simple server to run API routes locally without Vercel
import express from 'express';
import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './api/[...path]';

const app = express();
app.use(express.json());

// Convert Express req/res to Vercel format - catch all routes starting with /api
app.use('/api', async (req: Request, res: Response) => {
  // Parse URL to extract path segments for Vercel format
  const urlPath = req.path; // e.g., "/auth/login" or "/users"
  const segments = urlPath.split('/').filter(Boolean);
  
  const vercelReq = {
    ...req,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: {
      ...req.query,
      path: segments.length === 1 ? segments[0] : segments.length > 0 ? segments : undefined,
    },
  } as VercelRequest;

  let statusCode = 200;
  const vercelRes: VercelResponse = Object.assign(res, {
    status(code: number) {
      statusCode = code;
      res.status(code);
      return vercelRes;
    },
    json(data: unknown) {
      res.status(statusCode).json(data);
      return vercelRes;
    },
    send(data: unknown) {
      res.status(statusCode).send(data);
      return vercelRes;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      res.setHeader(name, value);
      return vercelRes;
    },
  });

  try {
    await handler(vercelReq, vercelRes);
    if (!res.headersSent) {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = typeof (error as { message?: unknown })?.message === 'string' ? (error as { message: string }).message : 'Internal server error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`   API routes available at http://localhost:${PORT}/api/*`);
});
