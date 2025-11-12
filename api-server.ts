// Simple server to run API routes locally without Vercel
import express from 'express';
import type { Request, Response } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './api/[...path].js';

const app = express();
app.use(express.json());

// Convert Express req/res to Vercel format - catch all routes starting with /api
app.use('/api', async (req: Request, res: Response) => {
  // Parse URL to extract path segments for Vercel format
  const urlPath = req.path; // e.g., "/auth/login" or "/users"
  const segments = urlPath.split('/').filter(Boolean);
  
  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers as any,
    body: req.body,
    query: {
      ...req.query,
      path: segments.length === 1 ? segments[0] : segments.length > 0 ? segments : undefined,
    },
  } as VercelRequest;
  
  let statusCode = 200;
  const vercelRes = {
    status: (code: number) => {
      statusCode = code;
      res.status(code);
      return vercelRes;
    },
    json: (data: any) => {
      res.status(statusCode).json(data);
      return vercelRes;
    },
    send: (data: any) => {
      res.status(statusCode).send(data);
      return vercelRes;
    },
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
      return vercelRes;
    },
  } as VercelResponse;
  
  try {
    await handler(vercelReq, vercelRes);
    if (!res.headersSent) {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`   API routes available at http://localhost:${PORT}/api/*`);
});
