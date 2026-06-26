import React, { useState, useEffect } from 'react';
import { McpServerInfo, McpTool } from '../types.js';
import { Play, PlayCircle, Cpu, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface PlaygroundProps {
  servers: McpServerInfo[];
  callTool: (serverId: string, toolName: string, args: Record<string, any>) => Promise<any>;
}

export function Playground({ servers, callTool }: PlaygroundProps) {
  const activeServers = servers.filter((s) => s.status === 'connected');
  
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [selectedToolName, setSelectedToolName] = useState<string>('');
  const [args, setArgs] = useState<Record<string, any>>({});
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const selectedServer = activeServers.find((s) => s.id === selectedServerId);
  const tools = selectedServer?.tools || [];
  const selectedTool = tools.find((t) => t.name === selectedToolName);

  // Reset tool selection when server changes
  useEffect(() => {
    if (activeServers.length > 0 && !selectedServerId) {
      setSelectedServerId(activeServers[0].id);
    }
  }, [activeServers, selectedServerId]);

  useEffect(() => {
    if (tools.length > 0) {
      setSelectedToolName(tools[0].name);
    } else {
      setSelectedToolName('');
    }
  }, [selectedServerId, tools]);

  // Set default arguments based on tool schema
  useEffect(() => {
    if (selectedTool) {
      const defaultArgs: Record<string, any> = {};
      const properties = selectedTool.inputSchema?.properties || {};
      
      for (const [key, value] of Object.entries(properties) as [string, any][]) {
        if (value.default !== undefined) {
          defaultArgs[key] = value.default;
        } else if (value.type === 'boolean') {
          defaultArgs[key] = false;
        } else {
          defaultArgs[key] = '';
        }
      }
      setArgs(defaultArgs);
      setResult(null);
      setError(null);
      setLatency(null);
    }
  }, [selectedTool]);

  const handleArgChange = (name: string, value: any, type: string) => {
    let parsedValue = value;
    if (type === 'number' || type === 'integer') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'boolean') {
      parsedValue = Boolean(value);
    } else if (type === 'object' || type === 'array') {
      // Keep string until submit, where we try parsing JSON
      parsedValue = value;
    }
    
    setArgs((prev) => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServerId || !selectedToolName) return;

    setIsRunning(true);
    setResult(null);
    setError(null);
    setLatency(null);

    const startTime = performance.now();

    // Prepare arguments (parse JSON string inputs if needed)
    const finalArgs: Record<string, any> = {};
    const properties = selectedTool?.inputSchema?.properties || {};

    for (const [key, val] of Object.entries(args)) {
      const propSchema = properties[key] || {};
      if ((propSchema.type === 'object' || propSchema.type === 'array') && typeof val === 'string' && val.trim()) {
        try {
          finalArgs[key] = JSON.parse(val);
        } catch (err: any) {
          setError(`Invalid JSON in parameter "${key}": ${err.message}`);
          setIsRunning(false);
          return;
        }
      } else if (val !== '') {
        finalArgs[key] = val;
      }
    }

    try {
      const res = await callTool(selectedServerId, selectedToolName, finalArgs);
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setResult(res);
    } catch (err: any) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setError(err.message || 'An unknown error occurred while running the tool.');
    } finally {
      setIsRunning(false);
    }
  };

  // Renders the parameter inputs dynamically
  const renderSchemaInputs = () => {
    if (!selectedTool || !selectedTool.inputSchema) return null;

    const { properties = {}, required = [] } = selectedTool.inputSchema;

    return Object.entries(properties).map(([name, schema]: [string, any]) => {
      const isRequired = required.includes(name);
      const currentValue = args[name] !== undefined ? args[name] : '';

      return (
        <div key={name} className="form-group">
          <label className="form-label" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span>{name}</span>
            {isRequired && <span style={{ color: 'var(--color-error)' }}>*</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({schema.type})</span>
          </label>
          
          {schema.description && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              {schema.description}
            </span>
          )}

          {schema.type === 'boolean' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '4px 0' }}>
              <input
                type="checkbox"
                checked={!!currentValue}
                onChange={(e) => handleArgChange(name, e.target.checked, 'boolean')}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Enable {name}</span>
            </label>
          ) : schema.type === 'object' || schema.type === 'array' ? (
            <textarea
              className="form-input"
              rows={4}
              value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : currentValue}
              onChange={(e) => handleArgChange(name, e.target.value, schema.type)}
              placeholder={schema.type === 'array' ? '[ "item1", "item2" ]' : '{ "key": "value" }'}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                resize: 'vertical'
              }}
            />
          ) : (
            <input
              type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
              className="form-input"
              value={currentValue}
              onChange={(e) => handleArgChange(name, e.target.value, schema.type)}
              placeholder={schema.placeholder || `Enter ${name}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
            />
          )}
        </div>
      );
    });
  };

  if (activeServers.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <AlertCircle className="empty-state-icon" style={{ color: 'var(--color-starting)' }} />
        <h3>No Running MCP Servers</h3>
        <p style={{ marginTop: '8px' }}>
          You must toggle on at least one server from the Dashboard to use the Tool Playground.
        </p>
      </div>
    );
  }

  return (
    <div className="playground-layout">
      {/* Selector Panel */}
      <div className="selector-panel">
        <div>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Select Server</label>
          <select
            value={selectedServerId}
            onChange={(e) => {
              setSelectedServerId(e.target.value);
            }}
            className="form-input"
            style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
          >
            {activeServers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.source.split('-')[0]})</option>
            ))}
          </select>
        </div>

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Exposed Tools</label>
          {tools.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tools available.</span>
          ) : (
            <div className="sidebar-list">
              {tools.map((t) => (
                <div
                  key={t.name}
                  className={`sidebar-item ${selectedToolName === t.name ? 'selected' : ''}`}
                  onClick={() => setSelectedToolName(t.name)}
                >
                  <Cpu size={14} style={{ opacity: 0.7 }} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Form and Output */}
      <div className="playground-main">
        {selectedTool ? (
          <>
            <div className="playground-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlayCircle style={{ color: 'var(--color-primary)' }} />
                {selectedTool.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {selectedTool.description || 'No description provided by server.'}
              </p>
            </div>

            <div className="playground-content">
              {/* Form Side */}
              <form onSubmit={handleSubmit} className="playground-input-side">
                <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
                  {renderSchemaInputs()}
                </div>
                <button
                  type="submit"
                  disabled={isRunning}
                  className="btn"
                  style={{
                    width: '100%',
                    marginTop: '20px'
                  }}
                >
                  <Play size={16} />
                  {isRunning ? 'Running Tool...' : 'Execute Tool'}
                </button>
              </form>

              {/* Output Side */}
              <div className="playground-output-side">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Response</span>
                  {latency && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {latency}ms
                    </span>
                  )}
                </div>

                <div style={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {isRunning && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-secondary)' }}>
                      <div className="btn" style={{ background: 'transparent', padding: 0 }}>
                        <Clock size={32} style={{ animation: 'spin 2s linear infinite' }} />
                      </div>
                      <span>Waiting for server response...</span>
                    </div>
                  )}

                  {error && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      color: 'var(--color-error)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}>
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong>Tool Execution Failed</strong>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</p>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        color: 'var(--color-connected)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <CheckCircle size={16} />
                        <span>Execution completed successfully</span>
                      </div>

                      <pre style={{
                        background: '#05060b',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: '#f3f4f6',
                        overflow: 'auto',
                        flexGrow: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!isRunning && !error && !result && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
                      <Cpu size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p style={{ fontSize: '0.85rem' }}>Fill in parameters and click "Execute Tool" to see output.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Cpu className="empty-state-icon" />
            <p>No tool selected. Select a server and tool from the list.</p>
          </div>
        )}
      </div>
    </div>
  );
}
