# SpacetimeDB MCP Server

A comprehensive Model Context Protocol (MCP) server for [SpacetimeDB](https://spacetimedb.com) - enabling AI assistants to interact with your SpacetimeDB instances, query tables, call reducers, and manage your database operations.

## Features

- **🔌 Connection Management**: Connect to local or cloud SpacetimeDB instances
- **📊 Table Operations**: Query tables with filtering, pagination, and real-time subscriptions
- **⚡ Reducer Invocation**: Call server-side functions (reducers) with parameters
- **🗂️ Schema Introspection**: Explore database schemas, tables, and available reducers
- **🔍 SQL Support**: Execute SQL queries (where supported)
- **🔐 Authentication**: Support for token-based authentication
- **📡 Real-time Subscriptions**: Subscribe to table updates for live data
- **🎯 MCP Resources**: Expose tables, schemas, and reducers as MCP resources

## What is SpacetimeDB?

SpacetimeDB is a database that functions as a server, allowing you to run your application logic directly inside the database. Perfect for:
- Multiplayer game backends
- Real-time collaborative applications
- Chat and messaging systems
- Any low-latency, state-synchronized application

## Prerequisites

- **Node.js** 18.0.0 or higher
- **SpacetimeDB CLI** installed and configured ([installation guide](https://spacetimedb.com/install))
- A running SpacetimeDB instance (local or cloud)

## Installation

1. Clone or download this repository:

   **Bash:**
   ```bash
   cd spacetimedb-mcp-server
   ```

   **Windows CMD:**
   ```cmd
   cd spacetimedb-mcp-server
   ```

2. Install dependencies:

   **Bash/CMD:**
   ```bash
   npm install
   ```

3. Build the project:

   **Bash/CMD:**
   ```bash
   npm run build
   ```

## Configuration

### For Claude Desktop

Add to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spacetimedb": {
      "command": "node",
      "args": [
        "E:\\AI\\claude\\spacetimedb-mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

### For Other MCP Clients

The server runs on stdio transport and can be used with any MCP-compatible client:

**Bash/CMD:**
```bash
node dist/index.js
```

## Usage

### 1. Connect to SpacetimeDB

First, establish a connection to your SpacetimeDB instance:

```typescript
// Connect to local instance
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "my-game-server"
})

// Connect to cloud instance with auth
spacetimedb_connect({
  uri: "wss://testnet.spacetimedb.com",
  module_name: "my-production-module",
  auth_token: "your-token-here"
})
```

### 2. List Available Tables

```typescript
spacetimedb_list_tables({
  include_schema: true
})
```

### 3. Query Table Data

```typescript
// Simple query
spacetimedb_query_table({
  table_name: "users"
})

// With filtering and pagination
spacetimedb_query_table({
  table_name: "messages",
  filter: '{"sender": "alice"}',
  limit: 50,
  offset: 0
})
```

### 4. Call Reducers

Reducers are server-side functions that modify database state:

```typescript
// Call a reducer with arguments
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello, world!", "general"]'
})

spacetimedb_call_reducer({
  reducer_name: "set_name",
  args: '["Alice"]'
})
```

### 5. Subscribe to Real-time Updates

```typescript
spacetimedb_subscribe_table({
  table_name: "users",
  filter: '{"online": true}'
})
```

### 6. Get Schema Information

```typescript
// Get entire database schema
spacetimedb_get_schema({})

// Get specific table schema
spacetimedb_get_schema({
  table_name: "messages"
})
```

### 7. List Available Reducers

```typescript
spacetimedb_list_reducers({
  include_signatures: true
})
```

### 8. Execute SQL Queries

```typescript
spacetimedb_execute_sql({
  query: "SELECT * FROM users WHERE online = true"
})
```

## Available Tools

| Tool | Description |
|------|-------------|
| `spacetimedb_connect` | Connect to a SpacetimeDB instance |
| `spacetimedb_disconnect` | Disconnect from current instance |
| `spacetimedb_list_tables` | List all tables with optional schema |
| `spacetimedb_query_table` | Query table data with filtering/pagination |
| `spacetimedb_call_reducer` | Invoke a reducer function |
| `spacetimedb_subscribe_table` | Subscribe to real-time table updates |
| `spacetimedb_get_schema` | Get database or table schema |
| `spacetimedb_list_reducers` | List available reducers |
| `spacetimedb_get_identity` | Get current client identity |
| `spacetimedb_execute_sql` | Execute SQL queries |
| `spacetimedb_get_connection_info` | Get connection status |

## MCP Resources

The server exposes the following resources:

- `spacetimedb://tables/{table_name}` - Direct access to table data
- `spacetimedb://schema` - Complete database schema
- `spacetimedb://reducers` - List of all callable reducers

## Architecture

### Connection Manager

The `SpacetimeDBConnectionManager` class handles:
- WebSocket connections to SpacetimeDB instances
- CLI command execution for operations
- Query and subscription management
- Schema caching and introspection

### Dual Implementation Approach

This MCP server uses a **hybrid approach**:

1. **CLI-based operations**: For module management, deployment, and admin tasks
2. **SDK-based operations**: For real-time connections and subscriptions (when bindings are generated)

This provides maximum flexibility for both development and production use.

## Use Cases

### For Game Development

```typescript
// Check online players
spacetimedb_query_table({
  table_name: "players",
  filter: '{"online": true}'
})

// Send player action
spacetimedb_call_reducer({
  reducer_name: "player_move",
  args: '[100, 200, 50]'  // x, y, z coordinates
})
```

### For Chat Applications

```typescript
// Get recent messages
spacetimedb_query_table({
  table_name: "messages",
  limit: 100
})

// Send new message
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello everyone!", "general"]'
})
```

### For Real-time Dashboards

```typescript
// Subscribe to live metrics
spacetimedb_subscribe_table({
  table_name: "system_metrics"
})

// Query historical data
spacetimedb_execute_sql({
  query: "SELECT * FROM metrics WHERE timestamp > NOW() - INTERVAL '1 hour'"
})
```

## Development

### Building

**Bash/CMD:**
```bash
npm run build
```

### Development Mode (with hot reload)

**Bash/CMD:**
```bash
npm run dev
```

### Watch Mode

**Bash/CMD:**
```bash
npm run watch
```

## Troubleshooting

### "spacetime command not found"

Make sure SpacetimeDB CLI is installed:

**Bash/Linux/macOS:**
```bash
curl -fsSL https://install.spacetimedb.com | bash
```

**Windows PowerShell:**
```powershell
iwr https://install.spacetimedb.com -useb | iex
```

**Windows CMD:**
```cmd
rem Visit https://spacetimedb.com/install for the installer
```

### Connection Failures

- Verify SpacetimeDB is running: `spacetime start`
- Check URI format (ws:// for local, wss:// for cloud)
- Ensure module name matches your deployed module
- For cloud instances, verify authentication token

### "Module not found"

List available modules:

**Bash/CMD:**
```bash
spacetime list
```

Deploy your module:

**Bash/CMD:**
```bash
spacetime publish your-module-name --project-path ./path/to/module
```

## SpacetimeDB Module Development

To use this MCP server effectively, you'll need SpacetimeDB modules. Here's a quick example:

### Rust Module Example

```rust
use spacetimedb::{table, reducer, SpacetimeType};

#[table(name = users)]
pub struct User {
    #[primarykey]
    pub identity: Identity,
    pub name: String,
    pub online: bool,
}

#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let user = User {
        identity: ctx.sender,
        name,
        online: true,
    };
    ctx.db.users().insert(user)?;
    Ok(())
}
```

Compile and publish:

**Bash/CMD:**
```bash
spacetime publish my-module --project-path ./my-module
```

## Performance Considerations

- **Connection Pooling**: Reuse connections across operations
- **Query Limits**: Use pagination for large datasets
- **Subscription Management**: Unsubscribe when no longer needed
- **Schema Caching**: Schema information is cached to reduce overhead

## Security

- **Authentication**: Always use auth tokens for production instances
- **Network**: Use WSS (WebSocket Secure) for cloud connections
- **SQL Injection**: Parameterize queries when using `execute_sql`
- **Access Control**: Respect SpacetimeDB's row-level security

## Contributing

Contributions welcome! This MCP server can be enhanced with:
- WebSocket connection pooling
- Better error handling and retries
- Automatic module binding generation
- Streaming query results
- Transaction support
- Advanced subscription filtering

## Related Resources

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [SpacetimeDB TypeScript SDK](https://spacetimedb.com/docs/sdks/typescript)
- [SpacetimeDB Rust Guide](https://spacetimedb.com/docs/modules/rust)

## License

MIT

## Support

- SpacetimeDB Discord: [discord.gg/spacetimedb](https://discord.gg/spacetimedb)
- SpacetimeDB Issues: [github.com/clockworklabs/SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB)
- MCP Documentation: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**Built with ❤️ for the SpacetimeDB and MCP communities**
