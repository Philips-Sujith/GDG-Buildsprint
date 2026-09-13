import { createServer } from 'vite';

const server = await createServer({
  server: { port: 5173 },
});

await server.listen();
server.printUrls();

// Keep node process alive permanently in background
setInterval(() => {}, 60000);
