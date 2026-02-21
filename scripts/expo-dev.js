const { spawn } = require('child_process');

process.env.EXPO_PUBLIC_DOMAIN = `${process.env.REPLIT_DEV_DOMAIN}:5000`;

const child = spawn('npx', ['expo', 'start', '--port', '8081'], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd()
});

child.on('exit', (code) => process.exit(code || 0));
