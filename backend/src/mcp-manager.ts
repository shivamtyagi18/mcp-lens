import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseAllConfigs } from './config-parser.js';
import { McpServerInfo, ServerLog, McpTool, McpResource, McpPrompt } from './types.js';
import { WebSocket } from 'ws';

export class McpManager {
  private servers: Map<string, McpServerInfo> = new Map();
  private connections: Map<string, { client: Client; transport: StdioClientTransport }> = new Map();
  private logs: ServerLog[] = [];
  private maxLogs = 1000;
  private wsClients: Set<WebSocket> = new Set();
  private localWorkspacePath?: string;

  constructor(localWorkspacePath?: string) {
    this.localWorkspacePath = localWorkspacePath;
    this.refreshServers();

    // Ensure all spawned subprocesses are terminated on exit
    process.on('exit', () => this.shutdownAllSync());
    process.on('SIGINT', () => {
      this.shutdownAllSync();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.shutdownAllSync();
      process.exit(0);
    });
  }

  /**
   * Refreshes the list of configured servers from config files without killing running ones.
   */
  public refreshServers(): McpServerInfo[] {
    const parsed = parseAllConfigs(this.localWorkspacePath);
    
    // Track current running server IDs
    const newServerMap = new Map<string, McpServerInfo>();

    for (const info of parsed) {
      const existing = this.servers.get(info.id);
      if (existing && (existing.status === 'connected' || existing.status === 'starting')) {
        // Keep runtime state
        newServerMap.set(info.id, {
          ...info,
          status: existing.status,
          pid: existing.pid,
          tools: existing.tools,
          resources: existing.resources,
          prompts: existing.prompts,
          error: existing.error
        });
      } else {
        newServerMap.set(info.id, info);
      }
    }

    // Keep servers that are running but might have been removed from the config (optional, but safer)
    for (const [id, info] of this.servers.entries()) {
      if ((info.status === 'connected' || info.status === 'starting') && !newServerMap.has(id)) {
        newServerMap.set(id, info);
      }
    }

    this.servers = newServerMap;
    return this.getServers();
  }

  public getServers(): McpServerInfo[] {
    return Array.from(this.servers.values());
  }

  public getServer(id: string): McpServerInfo | undefined {
    return this.servers.get(id);
  }

  public getLogs(): ServerLog[] {
    return this.logs;
  }

  public addWebSocketClient(ws: WebSocket) {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  private broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const ws of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private log(serverId: string, type: 'stdout' | 'stderr' | 'system', message: string) {
    const logEntry: ServerLog = {
      serverId,
      type,
      message,
      timestamp: new Date().toISOString()
    };
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.broadcast({ type: 'log', data: logEntry });
  }

  /**
   * Starts an MCP server subprocess and connects the client.
   */
  public async startServer(id: string): Promise<McpServerInfo> {
    const serverInfo = this.servers.get(id);
    if (!serverInfo) {
      throw new Error(`Server with ID ${id} not found.`);
    }

    if (serverInfo.status === 'connected' || serverInfo.status === 'starting') {
      return serverInfo;
    }

    serverInfo.status = 'starting';
    serverInfo.error = undefined;
    this.log(id, 'system', `Starting MCP server: ${serverInfo.name} (${serverInfo.config.command})...`);
    this.broadcast({ type: 'status_change', serverId: id, status: 'starting' });

    try {
      // Merge parent process env with server config env, filtering out undefined values
      const env: Record<string, string> = {};
      for (const [key, value] of Object.entries({ ...process.env, ...(serverInfo.config.env || {}) })) {
        if (value !== undefined) {
          env[key] = value;
        }
      }

      const transport = new StdioClientTransport({
        command: serverInfo.config.command,
        args: serverInfo.config.args,
        env
      });

      const client = new Client({
        name: 'mcp-lens-inspector',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // Hook up stderr/stdout logs using casting workaround since process is private
      await client.connect(transport);
      const childProcess = (transport as any)._process;

      if (childProcess) {
        serverInfo.pid = childProcess.pid;
        this.log(id, 'system', `Subprocess spawned with PID ${childProcess.pid}`);

        // Listen to stderr for logs
        childProcess.stderr?.on('data', (chunk: Buffer) => {
          this.log(id, 'stderr', chunk.toString());
        });

        // StdioClientTransport closes stdout, but if anything leaks or on error:
        childProcess.on('error', (err: Error) => {
          this.log(id, 'system', `Process error: ${err.message}`);
          this.handleServerCrash(id, err.message);
        });

        childProcess.on('close', (code: number) => {
          this.log(id, 'system', `Process exited with code ${code}`);
          this.handleServerCrash(id, `Process exited with code ${code}`);
        });
      }

      this.connections.set(id, { client, transport });

      // Fetch capabilities
      this.log(id, 'system', `Querying server capabilities...`);
      
      let tools: McpTool[] = [];
      let resources: McpResource[] = [];
      let prompts: McpPrompt[] = [];

      try {
        const toolsResult = await client.listTools();
        tools = (toolsResult.tools || []) as McpTool[];
        this.log(id, 'system', `Found ${tools.length} tools`);
      } catch (e: any) {
        this.log(id, 'system', `Failed to list tools: ${e.message}`);
      }

      try {
        const resourcesResult = await client.listResources();
        resources = (resourcesResult.resources || []) as McpResource[];
        this.log(id, 'system', `Found ${resources.length} resources`);
      } catch (e: any) {
        this.log(id, 'system', `Failed to list resources: ${e.message}`);
      }

      try {
        const promptsResult = await client.listPrompts();
        prompts = (promptsResult.prompts || []) as McpPrompt[];
        this.log(id, 'system', `Found ${prompts.length} prompts`);
      } catch (e: any) {
        this.log(id, 'system', `Failed to list prompts: ${e.message}`);
      }

      serverInfo.status = 'connected';
      serverInfo.tools = tools;
      serverInfo.resources = resources;
      serverInfo.prompts = prompts;

      this.broadcast({
        type: 'status_change',
        serverId: id,
        status: 'connected',
        pid: serverInfo.pid,
        tools,
        resources,
        prompts
      });

      return serverInfo;
    } catch (err: any) {
      serverInfo.status = 'error';
      serverInfo.error = err.message;
      this.log(id, 'system', `Error starting server: ${err.message}`);
      this.broadcast({ type: 'status_change', serverId: id, status: 'error', error: err.message });
      this.connections.delete(id);
      return serverInfo;
    }
  }

  /**
   * Stops an MCP server process.
   */
  public async stopServer(id: string): Promise<McpServerInfo> {
    const serverInfo = this.servers.get(id);
    const conn = this.connections.get(id);

    if (!serverInfo) {
      throw new Error(`Server with ID ${id} not found.`);
    }

    this.log(id, 'system', `Stopping server...`);

    if (conn) {
      try {
        await conn.transport.close();
      } catch (err) {
        // Suppress close errors
      }
      this.connections.delete(id);
    }

    serverInfo.status = 'stopped';
    serverInfo.pid = undefined;
    serverInfo.tools = undefined;
    serverInfo.resources = undefined;
    serverInfo.prompts = undefined;

    this.broadcast({ type: 'status_change', serverId: id, status: 'stopped' });
    return serverInfo;
  }

  /**
   * Call a tool on an active server.
   */
  public async callTool(serverId: string, toolName: string, args: Record<string, any>): Promise<any> {
    const conn = this.connections.get(serverId);
    if (!conn) {
      throw new Error(`Server ${serverId} is not connected.`);
    }

    this.log(serverId, 'system', `Executing tool "${toolName}" with args: ${JSON.stringify(args)}`);
    
    try {
      const result = await conn.client.callTool({
        name: toolName,
        arguments: args
      });
      this.log(serverId, 'system', `Tool "${toolName}" executed successfully.`);
      return result;
    } catch (err: any) {
      this.log(serverId, 'system', `Tool "${toolName}" failed: ${err.message}`);
      throw err;
    }
  }

  private handleServerCrash(id: string, errorMessage: string) {
    const serverInfo = this.servers.get(id);
    if (serverInfo && serverInfo.status !== 'stopped') {
      serverInfo.status = 'error';
      serverInfo.error = errorMessage;
      serverInfo.pid = undefined;
      serverInfo.tools = undefined;
      serverInfo.resources = undefined;
      serverInfo.prompts = undefined;
      this.connections.delete(id);
      this.broadcast({ type: 'status_change', serverId: id, status: 'error', error: errorMessage });
    }
  }

  private shutdownAllSync() {
    for (const [id, conn] of this.connections.entries()) {
      try {
        const childProcess = (conn.transport as any)._process;
        if (childProcess) {
          childProcess.kill('SIGKILL');
        }
      } catch (err) {
        // Sync exit cleanup
      }
    }
    this.connections.clear();
  }
}
