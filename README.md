# privateShare-core

Core module for eERC-20 operations and MCP server communication.

## Quick Navigation

- **[📋 Full Specification](./src/CORE.md)** - Complete API and architecture documentation
- **[📚 Main Documentation](https://github.com/a6b8/privateShare)** - Project overview and guides
- **[🔌 Middleware Module](https://github.com/FlowMCP/privateShare-mcp-middleware)** - MCP server integration

## Key Documentation Links

- **[EERC20.md](https://github.com/a6b8/privateShare/blob/main/EERC20.md)** - Encrypted ERC-20 technical reference
- **[SERVER.md](https://github.com/a6b8/privateShare/blob/main/server/SERVER.md)** - MCP server implementation guide

## What This Module Does

The Core module runs as a **separate PrivateShare Server** that:
- Polls MCP servers for usage statistics
- Calculates fair payment distribution  
- Executes eERC-20 batch transfers with privacy
- Manages payment confirmations

## Quick Start

```javascript
import { PrivateShare, ServerManager } from 'privateshare-core'

// Health check
PrivateShare.health()
ServerManager.health()

// Start server with cron job
const server = new ServerManager({
    cronInterval: 300000,
    mcpServers: [{ url: 'http://mcp1:8080', token: 'token' }]
})
server.start({ port: 3000 })
server.startCronJob()
```

## Repository

https://github.com/FlowMCP/privateShare-core