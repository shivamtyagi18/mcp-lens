export type ConfigSource = 'claude' | 'cursor-global' | 'cursor-local' | 'windsurf';

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpServerInfo {
  id: string;
  name: string;
  source: ConfigSource;
  config: McpServerConfig;
  status: 'stopped' | 'starting' | 'connected' | 'error';
  error?: string;
  pid?: number;
  tools?: McpTool[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface ServerLog {
  serverId: string;
  type: 'stdout' | 'stderr' | 'system';
  message: string;
  timestamp: string;
}
