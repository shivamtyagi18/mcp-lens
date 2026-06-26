import { useState, useEffect, useCallback, useRef } from 'react';
import { McpServerInfo, ServerLog } from '../types.js';

export function useMcp() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [workspace, setWorkspace] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial list of servers
  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data);
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  }, []);

  // Fetch initial log history
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }, []);

  // Toggle server running status
  const toggleServer = useCallback(async (id: string, active: boolean) => {
    const endpoint = active ? `/api/servers/${encodeURIComponent(id)}/start` : `/api/servers/${encodeURIComponent(id)}/stop`;
    
    // Optimistically update status to starting or stopping
    setServers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: active ? 'starting' : 'stopped' }
          : s
      )
    );

    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const updatedServer = await response.json();
      
      setServers((prev) =>
        prev.map((s) => (s.id === id ? updatedServer : s))
      );
    } catch (err) {
      console.error(`Error toggling server ${id}:`, err);
      // Revert or let WS message correct it
      fetchServers();
    }
  }, [fetchServers]);

  // Execute a tool
  const callTool = useCallback(async (serverId: string, toolName: string, args: Record<string, any>) => {
    const endpoint = `/api/servers/${encodeURIComponent(serverId)}/tools/${encodeURIComponent(toolName)}/call`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Execution failed with status ${response.status}`);
    }

    return await response.json();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    // Construct ws url based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // During dev, Vite proxies /ws. In prod, we connect to the same host.
    const wsUrl = `${protocol}//${host}/ws`;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WS Connection established');
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init') {
          setServers(msg.servers);
          setLogs(msg.logs);
          setWorkspace(msg.workspace);
        } else if (msg.type === 'status_change') {
          setServers((prev) =>
            prev.map((s) =>
              s.id === msg.serverId
                ? {
                    ...s,
                    status: msg.status,
                    pid: msg.pid,
                    tools: msg.tools,
                    resources: msg.resources,
                    prompts: msg.prompts,
                    error: msg.error
                  }
                : s
            )
          );
        } else if (msg.type === 'log') {
          setLogs((prev) => {
            const next = [...prev, msg.data];
            return next.slice(-1000); // Limit to last 1000 in frontend state
          });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WS Connection closed, retrying in 3s...');
        setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
        ws.close();
      };
    };

    connectWs();

    // Fetch initial state fallback in case ws connects slowly
    fetchServers();
    fetchLogs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchServers, fetchLogs]);

  return {
    servers,
    logs,
    workspace,
    isConnected,
    toggleServer,
    callTool,
    refreshServers: fetchServers
  };
}
