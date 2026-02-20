import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/auth/google/callback", (req: Request, res: Response) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        params.set(key, value);
      }
    }
    const deepLink = `debtfree://auth?${params.toString()}`;
    res.send(`
      <html>
        <head><title>Signing in...</title></head>
        <body style="background:#0D0D0D;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <p>Signing you in...</p>
            <p style="font-size:12px;color:#888;">If the app doesn't open automatically, <a href="${deepLink}" style="color:#E5FE40;">tap here</a>.</p>
          </div>
          <script>window.location.href = "${deepLink}";</script>
        </body>
      </html>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
