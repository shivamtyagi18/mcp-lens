import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { McpManager } from './mcp-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const localWorkspace = process.env.WORKSPACE_PATH || process.cwd();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const mcpManager = new McpManager(localWorkspace);

app.use(cors());
app.use(express.json());

// API Endpoints
app.get('/api/servers', (req, res) => {
  try {
    mcpManager.refreshServers();
    res.json(mcpManager.getServers());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers/:id/start', async (req, res) => {
  const { id } = req.params;
  try {
    const info = await mcpManager.startServer(id);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers/:id/stop', async (req, res) => {
  const { id } = req.params;
  try {
    const info = await mcpManager.stopServer(id);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers/:id/tools/:toolName/call', async (req, res) => {
  const { id, toolName } = req.params;
  const args = req.body || {};
  try {
    const result = await mcpManager.callTool(id, toolName, args);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.json(mcpManager.getLogs());
});

app.get('/api/workspace', (req, res) => {
  res.json({ path: localWorkspace });
});

// Serve frontend in production (if built)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not Found');
    }
  });
});

// WebSocket Server
wss.on('connection', (ws: WebSocket) => {
  mcpManager.addWebSocketClient(ws);
  
  // Send initial list and logs
  ws.send(JSON.stringify({
    type: 'init',
    servers: mcpManager.getServers(),
    logs: mcpManager.getLogs(),
    workspace: localWorkspace
  }));
});

httpServer.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  mcp-lens backend running on port ${PORT}`);
  console.log(`  Scanning workspace: ${localWorkspace}`);
  console.log(`========================================`);
});
