import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/auth/google/callback", (_req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Signing in...</title></head>
        <body style="background:#0D0D0D;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <p>Signing you in...</p>
            <p id="fallback" style="font-size:12px;color:#888;display:none;">If the app doesn't open, <a id="link" href="#" style="color:#E5FE40;">tap here</a>.</p>
          </div>
          <script>
            (function() {
              var hash = window.location.hash.substring(1);
              if (hash) {
                var deepLink = 'debtfree://auth?' + hash;
                document.getElementById('link').href = deepLink;
                setTimeout(function() {
                  document.getElementById('fallback').style.display = 'block';
                }, 2000);
                window.location.href = deepLink;
              } else {
                document.body.innerHTML = '<div style="text-align:center;"><p>Sign-in failed. Please close this window and try again.</p></div>';
              }
            })();
          </script>
        </body>
      </html>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
