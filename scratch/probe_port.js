const http = require('http');

const ports = [3000, 3001, 3002, 3003, 3004, 3005, 8080];

ports.forEach((port) => {
  const req = http.get(`http://127.0.0.1:${port}`, (res) => {
    console.log(`Port ${port}: HTTP ${res.statusCode}`);
  });
  req.on('error', () => {
    // ignore
  });
  req.setTimeout(1500, () => {
    req.destroy();
  });
});
