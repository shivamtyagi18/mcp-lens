import React, { useState } from 'react';
import { McpServerInfo } from '../types.js';
import { Play, Square, Settings, Cpu, HardDrive, HelpCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';

interface DashboardProps {
  servers: McpServerInfo[];
  toggleServer: (id: string, active: boolean) => Promise<void>;
  refreshServers: () => Promise<void>;
}

export function Dashboard({ servers, toggleServer, refreshServers }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshServers();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.config.command.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || s.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const totalServers = servers.length;
  const runningServers = servers.filter((s) => s.status === 'connected').length;
  const startingServers = servers.filter((s) => s.status === 'starting').length;
  const errorServers = servers.filter((s) => s.status === 'error').length;

  const getSourceStyles = (source: string) => {
    switch (source) {
      case 'claude':
        return {
          '--origin-color': 'var(--color-claude)',
          '--origin-glow': 'var(--color-claude-glow)',
        } as React.CSSProperties;
      case 'cursor-global':
      case 'cursor-local':
        return {
          '--origin-color': 'var(--color-cursor)',
          '--origin-glow': 'var(--color-cursor-glow)',
        } as React.CSSProperties;
      case 'windsurf':
        return {
          '--origin-color': 'var(--color-windsurf)',
          '--origin-glow': 'var(--color-windsurf-glow)',
        } as React.CSSProperties;
      case 'antigravity':
        return {
          '--origin-color': 'var(--color-antigravity)',
          '--origin-glow': 'var(--color-antigravity-glow)',
        } as React.CSSProperties;
      case 'codex':
        return {
          '--origin-color': 'var(--color-codex)',
          '--origin-glow': 'var(--color-codex-glow)',
        } as React.CSSProperties;
      default:
        return {
          '--origin-color': 'var(--color-primary)',
          '--origin-glow': 'var(--color-primary-glow)',
        } as React.CSSProperties;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'claude': return 'Claude Desktop';
      case 'cursor-global': return 'Cursor Global';
      case 'cursor-local': return 'Cursor Local';
      case 'windsurf': return 'Windsurf';
      case 'antigravity': return 'Antigravity';
      case 'codex': return 'Codex';
      default: return source;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Stats Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {[
          { label: 'Discovered Servers', value: totalServers, color: 'var(--text-primary)' },
          { label: 'Active', value: runningServers, color: 'var(--color-connected)', glow: 'var(--color-connected-glow)' },
          { label: 'Starting', value: startingServers, color: 'var(--color-starting)', animate: startingServers > 0 },
          { label: 'Errors / Crashes', value: errorServers, color: 'var(--color-error)' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: stat.glow ? `0 4px 20px -5px ${stat.glow}` : 'none'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.label}</span>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {stat.value}
              {stat.animate && (
                <RefreshCw size={20} className="spinning" style={{ color: 'var(--color-starting)', animation: 'spin 1.5s linear infinite' }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexGrow: 1, maxWidth: '600px' }}>
          <div style={{
            position: 'relative',
            flexGrow: 1
          }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input
              type="text"
              placeholder="Search by name, command..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '40px',
                borderRadius: 'var(--radius-md)'
              }}
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="form-input"
            style={{
              borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 24, 37, 0.6)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Clients</option>
            <option value="claude">Claude Desktop</option>
            <option value="cursor-global">Cursor Global</option>
            <option value="cursor-local">Cursor Local</option>
            <option value="windsurf">Windsurf</option>
            <option value="antigravity">Antigravity</option>
            <option value="codex">Codex</option>
          </select>
        </div>

        <button
          onClick={handleRefresh}
          className="btn"
          disabled={isRefreshing}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px'
          }}
        >
          <RefreshCw size={16} style={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
          }} />
          Scan Configurations
        </button>
      </div>

      {/* Grid of Servers */}
      {filteredServers.length === 0 ? (
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '80px 40px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>No MCP servers found</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            Try adding server configurations to Claude Desktop, Cursor, or Windsurf and refreshing.
          </p>
        </div>
      ) : (
        <div className="server-grid">
          {filteredServers.map((server) => {
            const isRunning = server.status === 'connected';
            const isStarting = server.status === 'starting';
            const isError = server.status === 'error';
            const isExpanded = expandedId === server.id;

            return (
              <div
                key={server.id}
                className="server-card"
                style={getSourceStyles(server.source)}
              >
                <div>
                  <div className="server-card-header">
                    <div className="server-identity">
                      <span className="server-name">{server.name}</span>
                      <span className="server-source-badge">{getSourceLabel(server.source)}</span>
                    </div>

                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={isRunning || isStarting}
                        disabled={isStarting}
                        onChange={(e) => toggleServer(server.id, e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="server-details">
                    <div className="detail-row">
                      <span className="detail-label">Executable / Command</span>
                      <span className="detail-value-code">{server.config.command} {server.config.args.join(' ')}</span>
                    </div>

                    {server.config.env && Object.keys(server.config.env).length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Env Variables</span>
                        <div className="env-pills">
                          {Object.keys(server.config.env).map((k) => (
                            <span key={k} className="env-pill">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {isError && server.error && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      color: 'var(--color-error)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '16px'
                    }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ wordBreak: 'break-word' }}>{server.error}</span>
                    </div>
                  )}

                  <div className="server-card-footer">
                    <span className={`status-badge ${server.status}`}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'currentColor',
                        boxShadow: isRunning ? '0 0 8px currentColor' : 'none'
                      }}></span>
                      {server.status}
                    </span>

                    {isRunning && (
                      <div className="capabilities-summary">
                        <div className="cap-badge" title="Tools">
                          <Cpu size={14} />
                          <span>{server.tools?.length || 0}</span>
                        </div>
                        <div className="cap-badge" title="Resources">
                          <HardDrive size={14} />
                          <span>{server.resources?.length || 0}</span>
                        </div>
                        <div className="cap-badge" title="Prompts">
                          <HelpCircle size={14} />
                          <span>{server.prompts?.length || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isRunning && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : server.id)}
                      className="btn"
                      style={{
                        width: '100%',
                        marginTop: '16px',
                        background: 'transparent',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details & Capabilities'}
                    </button>
                  )}

                  {isExpanded && isRunning && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Tools</h4>
                        {server.tools && server.tools.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {server.tools.map((t) => (
                              <div key={t.name} style={{
                                background: 'rgba(0,0,0,0.15)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(255,255,255,0.02)'
                              }}>
                                <strong style={{ color: 'var(--color-primary)' }}>{t.name}</strong>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' }}>{t.description || 'No description'}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No tools exposed</span>
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Resources</h4>
                        {server.resources && server.resources.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {server.resources.map((r) => (
                              <div key={r.uri} style={{
                                background: 'rgba(0,0,0,0.15)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(255,255,255,0.02)'
                              }}>
                                <strong style={{ color: 'var(--color-windsurf)' }}>{r.name}</strong>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', wordBreak: 'break-all' }}>{r.uri}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No resources exposed</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
