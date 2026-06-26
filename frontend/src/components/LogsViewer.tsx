import React, { useState, useEffect, useRef } from 'react';
import { ServerLog, McpServerInfo } from '../types.js';
import { Trash2, ShieldAlert, ArrowDown, Terminal } from 'lucide-react';

interface LogsViewerProps {
  logs: ServerLog[];
  servers: McpServerInfo[];
}

export function LogsViewer({ logs, servers }: LogsViewerProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [localLogs, setLocalLogs] = useState<ServerLog[]>([]);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Sync with prop, but allow clearing locally
  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  // Autoscroll logic
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localLogs, autoScroll]);

  const handleClearLogs = () => {
    setLocalLogs([]);
  };

  const filteredLogs = localLogs.filter((log) => {
    const matchesServer = selectedServerId === 'all' || log.serverId === selectedServerId;
    const matchesType = logTypeFilter === 'all' || log.type === logTypeFilter;
    const matchesSearch = log.message.toLowerCase().includes(searchText.toLowerCase()) || 
                          log.serverId.toLowerCase().includes(searchText.toLowerCase());
    return matchesServer && matchesType && matchesSearch;
  });

  const getServerFriendlyName = (id: string) => {
    const found = servers.find((s) => s.id === id);
    return found ? found.name : id.split(':')[1] || id;
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Log Console Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        background: 'var(--bg-panel)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1 }}>
          {/* Server Selector */}
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="form-input"
            style={{ minWidth: '160px', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="all">All Servers</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.source.split('-')[0]})</option>
            ))}
          </select>

          {/* Log Type Selector */}
          <select
            value={logTypeFilter}
            onChange={(e) => setLogTypeFilter(e.target.value)}
            className="form-input"
            style={{ minWidth: '120px', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="all">All Streams</option>
            <option value="stdout">stdout (messages)</option>
            <option value="stderr">stderr (logs)</option>
            <option value="system">system</option>
          </select>

          {/* Search Logs */}
          <input
            type="text"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="form-input"
            style={{ width: '220px', borderRadius: 'var(--radius-sm)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className="btn"
            style={{
              background: autoScroll ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: '1px solid var(--border-light)',
              color: autoScroll ? 'var(--color-primary)' : 'var(--text-secondary)',
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <ArrowDown size={14} style={{ opacity: autoScroll ? 1 : 0.5 }} />
            Auto-Scroll
          </button>
          
          <button
            onClick={handleClearLogs}
            className="btn"
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              color: '#f43f5e',
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="logs-console" style={{ flexGrow: 1, margin: 0 }}>
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <Terminal className="empty-state-icon" />
            <p>Console is quiet. No logs match active filters.</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            let originColor = 'var(--text-muted)';
            if (log.serverId.startsWith('claude')) originColor = 'var(--color-claude)';
            else if (log.serverId.startsWith('cursor')) originColor = 'var(--color-cursor)';
            else if (log.serverId.startsWith('windsurf')) originColor = 'var(--color-windsurf)';

            return (
              <div key={index} className="log-line">
                <span className="log-time">[{formatTimestamp(log.timestamp)}]</span>
                <span className="log-origin" style={{ color: originColor }}>
                  [{getServerFriendlyName(log.serverId)}]
                </span>
                <span className={`log-msg ${log.type}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
