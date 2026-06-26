import React, { useState } from 'react';
import { useMcp } from './hooks/useMcp.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { TopologyGraph } from './components/TopologyGraph.tsx';
import { Playground } from './components/Playground.tsx';
import { LogsViewer } from './components/LogsViewer.tsx';
import { LayoutGrid, Network, Play, Terminal, Wifi, WifiOff } from 'lucide-react';

type Tab = 'dashboard' | 'topology' | 'playground' | 'logs';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const {
    servers,
    logs,
    workspace,
    isConnected,
    toggleServer,
    callTool,
    refreshServers
  } = useMcp();

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Discovered MCP Servers';
      case 'topology': return 'System Topology Map';
      case 'playground': return 'Interactive Tool Playground';
      case 'logs': return 'Live Logs Console';
      default: return 'Dashboard';
    }
  };

  const runningServers = servers.filter((s) => s.status === 'connected').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-icon">🔍</div>
            <div className="logo-text">
              <h1>mcp-lens</h1>
              <span>Inspector Dashboard</span>
            </div>
          </div>

          <nav className="nav-links">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutGrid size={18} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('topology')}
              className={`nav-link ${activeTab === 'topology' ? 'active' : ''}`}
            >
              <Network size={18} />
              <span>Topology Map</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`nav-link ${activeTab === 'playground' ? 'active' : ''}`}
            >
              <Play size={18} />
              <span>Playground</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
            >
              <Terminal size={18} />
              <span>Live Logs</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (Workspace details) */}
        <div className="sidebar-footer">
          <div className="workspace-badge">
            <div className="workspace-badge-label">Active Workspace</div>
            <div className="workspace-badge-path" title={workspace || 'Scanning System'}>
              {workspace || 'Scanning System...'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-title">
            <h2>{getActiveTabTitle()}</h2>
          </div>

          <div className="header-stats">
            <div className="stat-item">
              <span className={`stat-dot ${isConnected ? 'connected' : 'stopped'}`}></span>
              <span>Backend: {isConnected ? 'Online' : 'Offline'}</span>
            </div>

            <div className="stat-item">
              <span className="stat-dot connected"></span>
              <span>{runningServers} Active Servers</span>
            </div>

            {/* Backend Connection Status Icon */}
            <div style={{ display: 'flex', alignItems: 'center', color: isConnected ? 'var(--color-connected)' : 'var(--color-error)' }}>
              {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
          </div>
        </header>

        {/* View Router */}
        <div className="view-container">
          {activeTab === 'dashboard' && (
            <Dashboard
              servers={servers}
              toggleServer={toggleServer}
              refreshServers={refreshServers}
            />
          )}

          {activeTab === 'topology' && (
            <TopologyGraph servers={servers} />
          )}

          {activeTab === 'playground' && (
            <Playground
              servers={servers}
              callTool={callTool}
            />
          )}

          {activeTab === 'logs' && (
            <LogsViewer
              logs={logs}
              servers={servers}
            />
          )}
        </div>
      </main>
    </div>
  );
}
