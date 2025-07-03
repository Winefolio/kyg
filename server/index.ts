import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Check database migration status on startup
(async () => {
  try {
    console.log('[DB_CHECK] Checking database migration status...');
    
    // Check if media table exists
    const mediaTableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'media'
      );
    `);
    
    const mediaTableExists = mediaTableCheck.rows[0]?.exists;
    
    if (!mediaTableExists) {
      console.error('[DB_CHECK] ❌ CRITICAL: Media table is missing!');
      console.error('[DB_CHECK] Run "npm run db:push" to apply migrations');
      console.error('[DB_CHECK] This is causing media upload failures');
    } else {
      console.log('[DB_CHECK] ✅ Media table exists');
    }
    
    // Log all tables for debugging
    const tables = await db.execute(sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log('[DB_CHECK] Current tables:', tables.rows.map(r => r.tablename).join(', '));
  } catch (error) {
    console.error('[DB_CHECK] Error checking database status:', error);
  }
})();

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://knowyourgrape.com', 'https://www.knowyourgrape.com'] // Update with your production domain
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight response for 24 hours
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Enhanced logging for session join debugging
  if (path.includes('/api/sessions') && path.includes('/participants') && req.method === 'POST') {
    console.log(`\n[JOIN_REQUEST] ${new Date().toISOString()}`);
    console.log(`[JOIN_REQUEST] ${req.method} ${path}`);
    console.log(`[JOIN_REQUEST] Params:`, req.params);
    console.log(`[JOIN_REQUEST] Body:`, JSON.stringify(req.body, null, 2));
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Log 500 errors with full details
      if (res.statusCode === 500) {
        console.error(`\n[500_ERROR] ${new Date().toISOString()}`);
        console.error(`[500_ERROR] ${req.method} ${path}`);
        console.error(`[500_ERROR] Response:`, capturedJsonResponse);
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Enhanced error logging for debugging
    if (status === 500 || err.code) {
      const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.error(`\n${'='.repeat(80)}`);
      console.error(`[GLOBAL_ERROR_HANDLER] ${errorId}`);
      console.error(`Timestamp: ${new Date().toISOString()}`);
      console.error(`Request: ${req.method} ${req.originalUrl}`);
      console.error(`Params:`, req.params);
      console.error(`Body:`, req.body);
      console.error(`Error:`, {
        name: err.name,
        message: err.message,
        code: err.code,
        detail: err.detail,
        table: err.table,
        constraint: err.constraint,
        stack: err.stack
      });
      console.error(`${'='.repeat(80)}\n`);
      
      // Include error ID in response for tracking
      res.status(status).json({ 
        message,
        errorId,
        errorCode: err.code,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(status).json({ message });
    }
    
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000');
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying alternative port...`);
      const alternativePort = port + 1;
      server.listen(alternativePort, "0.0.0.0", () => {
        log(`serving on port ${alternativePort}`);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
})();
