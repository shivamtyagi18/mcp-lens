<p align="center">
  <h1 align="center">🔎 mcp-lens</h1>
  <p align="center">
    <strong>The Interactive Visual Dashboard & Workspace Topology Mapper for Model Context Protocol (MCP) Servers.</strong>
  </p>
  <p align="center">
    <a href="https://github.com/shivamtyagi18/mcp-lens/stargazers"><img src="https://img.shields.io/github/stars/shivamtyagi18/mcp-lens?style=for-the-badge&color=8FA396" alt="Stars"></a>
    <a href="https://github.com/shivamtyagi18/mcp-lens/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-8FA396?style=for-the-badge" alt="License"></a>
    <img src="https://img.shields.io/badge/PRs-welcome-8FA396?style=for-the-badge" alt="PRs Welcome">
  </p>
</p>

---

## 🚀 What is mcp-lens?

**mcp-lens** is a local, zero-config visual workspace supervisor for developers working with the Model Context Protocol (MCP). It automatically aggregates, maps, and tests all active MCP servers configured across your environment (Cursor, Windsurf, and Claude Desktop) from a single glassmorphic dashboard.

```mermaid
graph TD
    subgraph Configurations
        Cursor[Cursor Config] --> Parser[config-parser.ts]
        Claude[Claude Desktop Config] --> Parser
        Windsurf[Windsurf Config] --> Parser
    end

    subgraph mcp-lens Backend
        Parser --> Manager[mcp-manager.ts]
        Manager -->|stdio/SSE| Servers[Active MCP Subprocesses]
        Manager -->|WebSocket Logs & Status| WebServer[Express + WS Server]
    end

    subgraph mcp-lens Frontend
        WebServer -->|Live Data Feed| ReactFlow[ReactFlow Topology Graph]
        WebServer -->|RPC Play| Playground[Interactive Play Playground]
    end
    
    style ReactFlow fill:#f9f,stroke:#333,stroke-width:2px
    style Playground fill:#bbf,stroke:#333,stroke-width:2px
```

---

## ✨ Features

*   **🔌 Universal Aggregator**: Scan and run Cursor, Windsurf, and Claude Desktop configuration servers simultaneously.
*   **🕸️ Interactive Topology Graph**: View server dependencies, resources, and tool cross-references styled in a premium dark mode dashboard using `ReactFlow`.
*   **⚡ RPC Tool Playground**: Instantly test server tools on-the-fly with dynamically generated JSON forms—no AI client required.
*   **⏱️ Observability & Logging**: Monitor tool execution latency and stream stderr logs from subprocesses in real-time.

---

## 📦 Quick Start

### Run Instantly via npx
```bash
npx mcp-lens
```

### Local Setup & Development
1. **Clone the repository:**
   ```bash
   git clone https://github.com/shivamtyagi18/mcp-lens.git
   cd mcp-lens
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development servers (Backend & Frontend concurrently):**
   ```bash
   npm run dev
   ```

Open **`http://localhost:5173`** to view your dashboard.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request. 

Give us a star ⭐ if you find this tool helpful!
