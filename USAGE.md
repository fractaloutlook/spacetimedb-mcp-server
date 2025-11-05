# SpacetimeDB MCP Server - Usage Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Tool Reference](#tool-reference)
3. [Common Workflows](#common-workflows)
4. [Advanced Usage](#advanced-usage)
5. [Examples](#examples)

## Quick Start

### 1. First Connection

Start by connecting to your SpacetimeDB instance:

```typescript
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "quickstart-chat"
})
```

Expected response:
```json
{
  "status": "connected",
  "identity": "abc123...",
  "message": "Connected to quickstart-chat at ws://localhost:3000"
}
```

### 2. Explore Your Database

List all tables:
```typescript
spacetimedb_list_tables({ include_schema: true })
```

View database schema:
```typescript
spacetimedb_get_schema({})
```

List available reducers:
```typescript
spacetimedb_list_reducers({ include_signatures: true })
```

## Tool Reference

### Connection Management

#### `spacetimedb_connect`

Establishes connection to a SpacetimeDB instance.

**Parameters:**
- `uri` (required): WebSocket URI (ws:// or wss://)
- `module_name` (required): Name of your deployed module
- `auth_token` (optional): Authentication token for secure connections

**Example:**
```typescript
spacetimedb_connect({
  uri: "wss://testnet.spacetimedb.com",
  module_name: "my-production-game",
  auth_token: "eyJhbGc..."
})
```

#### `spacetimedb_disconnect`

Closes current connection.

**Example:**
```typescript
spacetimedb_disconnect({})
```

#### `spacetimedb_get_connection_info`

Gets current connection status and metadata.

**Example:**
```typescript
spacetimedb_get_connection_info({})
```

**Response:**
```json
{
  "connected": true,
  "uri": "ws://localhost:3000",
  "module": "my-game",
  "authenticated": true,
  "activeSubscriptions": ["players", "messages"]
}
```

### Table Operations

#### `spacetimedb_list_tables`

Lists all tables in the database.

**Parameters:**
- `include_schema` (optional): Include column definitions (default: false)

**Example:**
```typescript
spacetimedb_list_tables({
  include_schema: true
})
```

**Response:**
```json
{
  "tables": [
    {
      "name": "users",
      "rowCount": 42,
      "schema": {
        "columns": [
          { "name": "identity", "type": "Identity", "nullable": false },
          { "name": "name", "type": "String", "nullable": false },
          { "name": "online", "type": "Bool", "nullable": false }
        ]
      }
    }
  ]
}
```

#### `spacetimedb_query_table`

Queries data from a table with optional filtering and pagination.

**Parameters:**
- `table_name` (required): Table to query
- `filter` (optional): JSON filter expression
- `limit` (optional): Max rows to return (default: 100)
- `offset` (optional): Rows to skip (default: 0)

**Examples:**

Simple query:
```typescript
spacetimedb_query_table({
  table_name: "messages"
})
```

With filter:
```typescript
spacetimedb_query_table({
  table_name: "users",
  filter: '{"online": true}'
})
```

With pagination:
```typescript
spacetimedb_query_table({
  table_name: "events",
  limit: 50,
  offset: 100
})
```

#### `spacetimedb_subscribe_table`

Subscribes to real-time table updates.

**Parameters:**
- `table_name` (required): Table to subscribe to
- `filter` (optional): JSON filter expression

**Example:**
```typescript
spacetimedb_subscribe_table({
  table_name: "players",
  filter: '{"team": "red"}'
})
```

**Response:**
```json
{
  "table": "players",
  "subscribed": true,
  "initialData": [
    { "id": 1, "name": "Alice", "team": "red" },
    { "id": 2, "name": "Bob", "team": "red" }
  ]
}
```

### Reducer Operations

#### `spacetimedb_call_reducer`

Invokes a server-side reducer function.

**Parameters:**
- `reducer_name` (required): Name of reducer to call
- `args` (required): JSON array of arguments

**Examples:**

No arguments:
```typescript
spacetimedb_call_reducer({
  reducer_name: "initialize_game",
  args: '[]'
})
```

With arguments:
```typescript
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello, world!", "general"]'
})
```

Multiple typed arguments:
```typescript
spacetimedb_call_reducer({
  reducer_name: "move_player",
  args: '[100.5, 200.3, 50.0, "running"]'
})
```

#### `spacetimedb_list_reducers`

Lists all available reducers in the module.

**Parameters:**
- `include_signatures` (optional): Include parameter signatures (default: false)

**Example:**
```typescript
spacetimedb_list_reducers({
  include_signatures: true
})
```

**Response:**
```json
{
  "reducers": [
    {
      "name": "send_message",
      "signature": "(text: String, channel: String) -> Result<(), String>",
      "description": "Send a message to a channel"
    },
    {
      "name": "set_name",
      "signature": "(name: String) -> Result<(), String>",
      "description": "Set user's display name"
    }
  ]
}
```

### Schema Operations

#### `spacetimedb_get_schema`

Gets database schema information.

**Parameters:**
- `table_name` (optional): Specific table name

**Examples:**

Entire database schema:
```typescript
spacetimedb_get_schema({})
```

Specific table schema:
```typescript
spacetimedb_get_schema({
  table_name: "users"
})
```

**Response:**
```json
{
  "database": "my-game",
  "tables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "identity",
          "type": "Identity",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "name",
          "type": "String",
          "nullable": false
        }
      ],
      "indexes": [
        {
          "name": "idx_users_name",
          "columns": ["name"]
        }
      ]
    }
  ]
}
```

### Identity Operations

#### `spacetimedb_get_identity`

Gets current client identity.

**Example:**
```typescript
spacetimedb_get_identity({})
```

**Response:**
```json
{
  "identity": "a1b2c3d4e5f6...",
  "authenticated": true
}
```

### SQL Operations

#### `spacetimedb_execute_sql`

Executes a SQL query (if supported by your module).

**Parameters:**
- `query` (required): SQL query string

**Examples:**

Simple SELECT:
```typescript
spacetimedb_execute_sql({
  query: "SELECT * FROM users WHERE online = true"
})
```

Aggregation:
```typescript
spacetimedb_execute_sql({
  query: "SELECT team, COUNT(*) as player_count FROM players GROUP BY team"
})
```

Joins:
```typescript
spacetimedb_execute_sql({
  query: "SELECT u.name, m.text FROM users u JOIN messages m ON u.identity = m.sender"
})
```

## Common Workflows

### Workflow 1: Initial Database Exploration

```typescript
// 1. Connect
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "my-app"
})

// 2. See what tables exist
spacetimedb_list_tables({ include_schema: true })

// 3. Check available reducers
spacetimedb_list_reducers({ include_signatures: true })

// 4. Query some data
spacetimedb_query_table({
  table_name: "users",
  limit: 10
})
```

### Workflow 2: Real-time Monitoring

```typescript
// 1. Connect
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "game-server"
})

// 2. Subscribe to active players
spacetimedb_subscribe_table({
  table_name: "players",
  filter: '{"online": true}'
})

// 3. Subscribe to recent events
spacetimedb_subscribe_table({
  table_name: "game_events"
})
```

### Workflow 3: Data Modification

```typescript
// 1. Connect
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "chat-app"
})

// 2. Set user name
spacetimedb_call_reducer({
  reducer_name: "set_name",
  args: '["Alice"]'
})

// 3. Send messages
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello everyone!", "general"]'
})

// 4. Verify data
spacetimedb_query_table({
  table_name: "messages",
  limit: 5
})
```

### Workflow 4: Analytics and Reporting

```typescript
// 1. Connect
spacetimedb_connect({
  uri: "wss://prod.spacetimedb.com",
  module_name: "analytics",
  auth_token: "prod-token"
})

// 2. Get user statistics
spacetimedb_execute_sql({
  query: "SELECT DATE(created_at), COUNT(*) FROM users GROUP BY DATE(created_at)"
})

// 3. Get active user count
spacetimedb_execute_sql({
  query: "SELECT COUNT(*) as active_users FROM users WHERE online = true"
})

// 4. Get message statistics
spacetimedb_query_table({
  table_name: "messages"
})
```

## Advanced Usage

### Custom Filters

Complex filtering with multiple conditions:

```typescript
spacetimedb_query_table({
  table_name: "players",
  filter: JSON.stringify({
    level: { $gte: 10 },
    team: "blue",
    online: true
  })
})
```

### Batch Operations

Execute multiple operations efficiently:

```typescript
// Call multiple reducers in sequence
const operations = [
  { reducer: "create_user", args: ["Alice"] },
  { reducer: "create_user", args: ["Bob"] },
  { reducer: "create_team", args: ["red", ["Alice", "Bob"]] }
];

for (const op of operations) {
  spacetimedb_call_reducer({
    reducer_name: op.reducer,
    args: JSON.stringify(op.args)
  });
}
```

### Error Handling

```typescript
try {
  const result = spacetimedb_call_reducer({
    reducer_name: "send_message",
    args: '["My message", "general"]'
  });

  if (result.status === "error") {
    console.error("Reducer failed:", result.message);
  }
} catch (error) {
  console.error("Connection error:", error);
}
```

### Pagination Pattern

```typescript
const PAGE_SIZE = 50;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const result = spacetimedb_query_table({
    table_name: "logs",
    limit: PAGE_SIZE,
    offset: offset
  });

  // Process results...

  hasMore = result.rows.length === PAGE_SIZE;
  offset += PAGE_SIZE;
}
```

## Examples

### Example 1: Multiplayer Game Backend

```typescript
// Connect to game server
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "space-shooter"
})

// Get current players
const players = spacetimedb_query_table({
  table_name: "players",
  filter: '{"alive": true}'
})

// Spawn player
spacetimedb_call_reducer({
  reducer_name: "spawn_player",
  args: '["Alice", 100, 100]'
})

// Move player
spacetimedb_call_reducer({
  reducer_name: "move_player",
  args: '[150, 200]'
})

// Subscribe to game state updates
spacetimedb_subscribe_table({
  table_name: "game_state"
})
```

### Example 2: Chat Application

```typescript
// Connect to chat server
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "chat-app"
})

// Set username
spacetimedb_call_reducer({
  reducer_name: "set_name",
  args: '["Alice"]'
})

// Get recent messages
const messages = spacetimedb_query_table({
  table_name: "messages",
  limit: 50
})

// Send message
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello everyone!", "general"]'
})

// Subscribe to new messages
spacetimedb_subscribe_table({
  table_name: "messages"
})
```

### Example 3: Real-time Dashboard

```typescript
// Connect to metrics server
spacetimedb_connect({
  uri: "wss://prod.example.com",
  module_name: "metrics",
  auth_token: "my-token"
})

// Get system metrics
const metrics = spacetimedb_query_table({
  table_name: "system_metrics",
  limit: 100
})

// Get user activity
const activity = spacetimedb_execute_sql({
  query: "SELECT hour, COUNT(*) FROM activity WHERE date = CURRENT_DATE GROUP BY hour"
})

// Subscribe to live metrics
spacetimedb_subscribe_table({
  table_name: "system_metrics"
})
```

## Tips and Best Practices

1. **Always connect first**: All operations require an active connection
2. **Use subscriptions wisely**: Unsubscribe when data is no longer needed
3. **Pagination for large datasets**: Use limit/offset for tables with many rows
4. **Filter at the database**: Use filter parameters instead of client-side filtering
5. **Handle errors**: Check return status and handle connection failures
6. **Secure production**: Always use WSS and authentication tokens in production
7. **Monitor subscriptions**: Use `get_connection_info` to track active subscriptions

## Troubleshooting

### Connection Issues

If connection fails:
1. Verify SpacetimeDB is running: `spacetime start`
2. Check URI format (ws:// vs wss://)
3. Confirm module name is correct: `spacetime list`
4. Test with CLI: `spacetime call module_name reducer_name`

### Query Issues

If queries fail:
1. Verify table exists: `spacetimedb_list_tables`
2. Check column names: `spacetimedb_get_schema`
3. Validate filter syntax (must be valid JSON)
4. Check permissions (row-level security)

### Reducer Issues

If reducer calls fail:
1. List available reducers: `spacetimedb_list_reducers`
2. Verify argument types match reducer signature
3. Check module logs for errors
4. Test with CLI: `spacetime call module_name reducer_name args`

---

For more help, see [README.md](README.md) or visit [spacetimedb.com/docs](https://spacetimedb.com/docs)
