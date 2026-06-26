import React, { useMemo, useState } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { McpServerInfo } from '../types.js';
import { Eye, EyeOff, LayoutGrid } from 'lucide-react';

interface TopologyGraphProps {
  servers: McpServerInfo[];
}

export function TopologyGraph({ servers }: TopologyGraphProps) {
  const [showTools, setShowTools] = useState(true);
  const [showResources, setShowResources] = useState(false);

  const { nodes, edges } = useMemo(() => {
    const list: Node[] = [];
    const connections: Edge[] = [];

    // 1. Create Core Client Node at center
    list.push({
      id: 'mcp-lens-client',
      type: 'input',
      data: { label: '🔍 mcp-lens Client' },
      position: { x: 50, y: 250 },
      style: {
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-windsurf) 100%)',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
        fontWeight: 'bold',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)'
      }
    });

    const activeServers = servers; // Show all to map full topology
    const serverSpacing = 160;
    const totalHeight = (activeServers.length - 1) * serverSpacing;
    const startY = 250 - totalHeight / 2;

    activeServers.forEach((server, sIdx) => {
      const serverX = 350;
      const serverY = startY + sIdx * serverSpacing;

      let borderStyle = '1px solid var(--border-light)';
      let glowColor = 'rgba(0, 0, 0, 0.3)';
      let labelPrefix = '⚫';

      if (server.status === 'connected') {
        labelPrefix = '🟢';
        if (server.source === 'claude') {
          borderStyle = '2px solid var(--color-claude)';
          glowColor = 'var(--color-claude-glow)';
        } else if (server.source.startsWith('cursor')) {
          borderStyle = '2px solid var(--color-cursor)';
          glowColor = 'var(--color-cursor-glow)';
        } else if (server.source === 'windsurf') {
          borderStyle = '2px solid var(--color-windsurf)';
          glowColor = 'var(--color-windsurf-glow)';
        }
      } else if (server.status === 'starting') {
        labelPrefix = '🟡';
        borderStyle = '2px dashed var(--color-starting)';
      } else if (server.status === 'error') {
        labelPrefix = '🔴';
        borderStyle = '2px solid var(--color-error)';
      }

      // 2. Server Node
      list.push({
        id: server.id,
        data: { label: `${labelPrefix} ${server.name}` },
        position: { x: serverX, y: serverY },
        style: {
          background: 'var(--bg-panel-solid)',
          color: 'var(--text-primary)',
          border: borderStyle,
          boxShadow: `0 4px 15px ${glowColor}`,
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 500,
          width: '180px',
          textAlign: 'center'
        }
      });

      // Edge from Client to Server
      connections.push({
        id: `c-to-${server.id}`,
        source: 'mcp-lens-client',
        target: server.id,
        animated: server.status === 'connected',
        style: {
          stroke: server.status === 'connected' ? 'var(--color-primary)' : 'var(--text-muted)',
          strokeWidth: server.status === 'connected' ? 2 : 1
        }
      });

      // Capabilities mapping
      const capabilities: { id: string; name: string; type: 'tool' | 'resource' }[] = [];
      
      if (showTools && server.tools) {
        server.tools.forEach((t) => capabilities.push({ id: `${server.id}-tool-${t.name}`, name: t.name, type: 'tool' }));
      }
      if (showResources && server.resources) {
        server.resources.forEach((r) => capabilities.push({ id: `${server.id}-res-${r.name}`, name: r.name, type: 'resource' }));
      }

      const capSpacing = 50;
      const totalCapHeight = (capabilities.length - 1) * capSpacing;
      const capStartY = serverY - totalCapHeight / 2;

      capabilities.forEach((cap, cIdx) => {
        const capX = 650;
        const capY = capStartY + cIdx * capSpacing;

        // Node for Tool / Resource
        list.push({
          id: cap.id,
          type: 'output',
          data: { label: `${cap.type === 'tool' ? '⚙️' : '📦'} ${cap.name}` },
          position: { x: capX, y: capY },
          style: {
            background: cap.type === 'tool' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(217, 70, 239, 0.05)',
            color: 'var(--text-secondary)',
            border: cap.type === 'tool' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(217, 70, 239, 0.3)',
            fontSize: '0.75rem',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            width: '180px',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }
        });

        // Edge from Server to Tool/Resource
        connections.push({
          id: `${server.id}-to-${cap.id}`,
          source: server.id,
          target: cap.id,
          style: {
            stroke: cap.type === 'tool' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(217, 70, 239, 0.4)',
            strokeWidth: 1
          }
        });
      });
    });

    return { nodes: list, edges: connections };
  }, [servers, showTools, showResources]);

  return (
    <div className="topology-container">
      {/* Visual Controls */}
      <div className="topology-controls">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Toggle View Layer:</span>
        
        <button
          onClick={() => setShowTools(!showTools)}
          className="btn"
          style={{
            background: showTools ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: '1px solid var(--border-light)',
            color: showTools ? 'var(--color-primary)' : 'var(--text-secondary)',
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {showTools ? <Eye size={14} /> : <EyeOff size={14} />}
          Tools
        </button>

        <button
          onClick={() => setShowResources(!showResources)}
          className="btn"
          style={{
            background: showResources ? 'rgba(217, 70, 239, 0.15)' : 'transparent',
            border: '1px solid var(--border-light)',
            color: showResources ? 'var(--color-windsurf)' : 'var(--text-secondary)',
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {showResources ? <Eye size={14} /> : <EyeOff size={14} />}
          Resources
        </button>
      </div>

      {/* React Flow Viewport */}
      <div className="topology-viewport">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background color="#1f2937" gap={16} />
          <Controls style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }} />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.id === 'mcp-lens-client') return 'var(--color-primary)';
              return 'var(--border-light)';
            }}
            nodeColor={(n) => {
              if (n.id === 'mcp-lens-client') return 'var(--color-primary)';
              return 'var(--bg-panel-solid)';
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
            style={{ background: 'var(--bg-panel-solid)', border: '1px solid var(--border-light)' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
