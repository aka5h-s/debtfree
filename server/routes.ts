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
            <p id="fallback" style="font-size:12px;color:#888;display:none;">If the app doesn't open automatically, <a id="link" href="#" style="color:#E5FE40;">tap here</a>.</p>
          </div>
          <script>
            (function() {
              var hash = window.location.hash.substring(1);
              var params = new URLSearchParams(hash);
              var idToken = params.get('id_token');
              if (idToken) {
                var deepLink = 'debtfree://auth?id_token=' + encodeURIComponent(idToken);
                document.getElementById('link').href = deepLink;
                window.location.href = deepLink;
                setTimeout(function() {
                  document.getElementById('fallback').style.display = 'block';
                }, 1500);
              } else {
                document.body.innerHTML = '<div style="text-align:center;"><p style="color:#EE4D37;">Sign-in failed. No token received.</p><p style="font-size:12px;color:#888;">Please close this window and try again.</p></div>';
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
