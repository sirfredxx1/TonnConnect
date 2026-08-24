import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serves manifest.json (and can serve an /icon.png next to it if you add one)
// at e.g. https://your-domain.example.com/manifest.json
app.use(express.static(path.join(__dirname, '..')));

app.get('/health', (_req, res) => res.send('ok'));

export function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Manifest server listening on port ${port}`);
  });
}
