import fs from 'fs';
import path from 'path';
import os from 'os';
import { McpRawConfig, McpServerInfo, ConfigSource } from './types.js';

const HOME = os.homedir();

// Standard locations for MCP configs on macOS (can extend to Windows/Linux if needed)
const CONFIG_PATHS: Record<Exclude<ConfigSource, 'cursor-local'>, string> = {
  'claude': path.join(HOME, 'Library/Application Support/Claude/claude_desktop_config.json'),
  'cursor-global': path.join(HOME, '.cursor/mcp.json'),
  'windsurf': path.join(HOME, '.codeium/windsurf/mcp_config.json')
};

/**
 * Reads a JSON config file safely. Returns null if file does not exist or fails to parse.
 */
function readConfigSafely(filePath: string): McpRawConfig | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as McpRawConfig;
  } catch (err) {
    console.error(`Failed to read/parse config at ${filePath}:`, err);
    return null;
  }
}

/**
 * Parses all available MCP configurations from standard locations and an optional local workspace.
 */
export function parseAllConfigs(localWorkspacePath?: string): McpServerInfo[] {
  const servers: McpServerInfo[] = [];

  // 1. Process standard global configs
  for (const [source, configPath] of Object.entries(CONFIG_PATHS)) {
    const raw = readConfigSafely(configPath);
    if (raw && raw.mcpServers) {
      for (const [name, serverConfig] of Object.entries(raw.mcpServers)) {
        servers.push({
          id: `${source}:${name}`,
          name,
          source: source as ConfigSource,
          config: serverConfig,
          status: 'stopped'
        });
      }
    }
  }

  // 2. Process local workspace config if path is provided
  if (localWorkspacePath) {
    const localConfigPath = path.join(localWorkspacePath, '.cursor', 'mcp.json');
    const raw = readConfigSafely(localConfigPath);
    if (raw && raw.mcpServers) {
      for (const [name, serverConfig] of Object.entries(raw.mcpServers)) {
        servers.push({
          id: `cursor-local:${name}`,
          name,
          source: 'cursor-local',
          config: serverConfig,
          status: 'stopped'
        });
      }
    }
  }

  return servers;
}

/**
 * Saves a configuration change back to the original file.
 * This is useful if a user wants to add/remove/edit configs directly in the dashboard.
 */
export function saveConfig(source: ConfigSource, servers: Record<string, any>, localWorkspacePath?: string): boolean {
  let targetPath = '';
  
  if (source === 'cursor-local') {
    if (!localWorkspacePath) return false;
    targetPath = path.join(localWorkspacePath, '.cursor', 'mcp.json');
  } else {
    targetPath = CONFIG_PATHS[source];
  }

  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const currentConfig = readConfigSafely(targetPath) || {};
    currentConfig.mcpServers = servers;

    fs.writeFileSync(targetPath, JSON.stringify(currentConfig, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Failed to save config to ${targetPath}:`, err);
    return false;
  }
}
