# SpacetimeDB MCP Server - Development Session Notes

**Date:** November 6-7, 2025
**Project:** SpacetimeDB Model Context Protocol (MCP) Server
**Status:** Partially Working - Discovery Features Complete, Data Operations Need SDK Implementation

---

## What We Built

A Model Context Protocol (MCP) server that allows Claude Desktop to interact with SpacetimeDB instances. The server acts as a bridge between Claude's AI capabilities and your SpacetimeDB database.

### Project Structure
```
E:\AI\claude\spacetimedb-mcp-server\
├── src/
│   ├── index.ts                      # Main MCP server
│   └── spacetimedb-connection.ts     # Connection manager (CLI-based)
├── dist/                             # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration Files
- **Claude Desktop Config:** `C:\Users\USER\AppData\Roaming\Claude\claude_desktop_config.json`
- **MCP Server Logs:** `C:\Users\USER\AppData\Roaming\Claude\logs\mcp-server-spacetimedb.log`

---

## Current Status

### ✅ What's Working

1. **Connection Management**
   - Successfully connects to remote SpacetimeDB instances
   - Properly converts WebSocket URIs (`wss://`) to HTTP URIs (`http://`) for CLI compatibility
   - Stores connection state

2. **Table Discovery**
   - ✅ Lists all 8 tables in your `status-module`:
     - admin
     - current_status
     - message
     - poll
     - poll_option
     - poll_vote
     - update_log
     - user

3. **Reducer Discovery**
   - ✅ Lists all 15 reducers:
     - add_admin, add_update, connect, create_poll, debug_admins
     - disconnect, force_init, init, manually_close_poll
     - send_message, set_name, test_log, update_status
     - view_status, vote_on_poll

### ❌ What's NOT Working

1. **Query Table Data** - `spacetimedb_query_table`
   - Error: `Unsupported: SELECT * FROM user LIMIT 100 OFFSET 0`
   - Reason: CLI-based SQL queries don't work against remote HTTP API

2. **Subscribe to Tables** - `spacetimedb_subscribe_table`
   - Error: Same as above (internally uses queryTable)
   - Reason: No real WebSocket connection, just CLI commands

3. **Get Schema Details** - `spacetimedb_get_schema`
   - Status: Likely broken (needs verification)
   - Returns basic schema but may not work fully

4. **Call Reducers** - `spacetimedb_call_reducer`
   - Status: Untested but likely broken
   - Reason: CLI-based approach may not work remotely

5. **Execute SQL** - `spacetimedb_execute_sql`
   - Error: Same SQL query issues
   - Reason: Remote HTTP API doesn't support arbitrary SQL

---

## Technical Details

### Your Server Setup
- **Remote Server:** Oracle Cloud VM
- **Domain:** api.fractaloutlook.com
- **Port:** 3000
- **Module:** status-module
- **Protocol:**
  - WebSocket clients use: `wss://api.fractaloutlook.com:3000`
  - HTTP API uses: `http://api.fractaloutlook.com:3000`
- **SSH Access:** `ssh -i "D:\keys\newdualsys.key" ubuntu@64.181.202.3`

### Local Setup
- **SpacetimeDB CLI Version:** 1.7.0 (upgraded from 1.0.0)
- **SpacetimeDB CLI Path:** `C:\Users\USER\AppData\Local\SpacetimeDB\bin\current\spacetimedb-cli.exe`
- **Node.js:** v22.13.1
- **Package Manager:** npm

### Key Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.4",
  "spacetimedb": "^1.7.0",  // Note: Currently unused, CLI-based only
  "zod": "^3.23.8"
}
```

---

## Issues Discovered & Fixed

### 1. Protocol Conversion Issue
**Problem:** SpacetimeDB CLI requires `http://` or `https://`, but users naturally think in terms of `wss://` (WebSocket Secure).

**Solution:** Automatic protocol conversion in `connect()`:
```typescript
if (uri.startsWith('wss://')) {
  cliUri = uri.replace('wss://', 'http://');
} else if (uri.startsWith('ws://')) {
  cliUri = uri.replace('ws://', 'http://');
}
```

**Note:** Currently converts everything to `http://` because your server uses plain HTTP on port 3000, even though WebSocket clients use `wss://` (probably via reverse proxy).

### 2. CLI Version Compatibility
**Problem:** Old CLI (v1.0.0) required `--json` flag but we weren't using it.

**Solution:** Added `--json` flag to all `spacetime describe` commands and implemented proper JSON parsing.

### 3. SSH Key Permissions
**Problem:** Windows file permissions on SSH key were too open after moving to `D:\keys\`.

**Solution:**
```bash
icacls "D:\keys\newdualsys.key" /inheritance:r
icacls "D:\keys\newdualsys.key" /grant:r "USER:R"
```

---

## Architecture: CLI-Based Approach (Current)

```
User → Claude Desktop → MCP Server → spacetime CLI → HTTP API → SpacetimeDB Server
                                         ↓
                            Executes shell commands:
                            - spacetime describe
                            - spacetime sql (broken remotely)
                            - spacetime call (untested)
```

**Limitations:**
- No real WebSocket connections
- No live subscriptions
- SQL queries don't work against remote servers
- Reducers may not work
- Single one-off queries only

---

## Next Steps: SDK Implementation Required

### Why We Need the SDK

The current CLI-based approach can only do discovery (list tables, list reducers). To actually **query data** or **call reducers**, we need to use the SpacetimeDB TypeScript SDK with real WebSocket connections.

### What Needs to Change

1. **Install Current SDK**
   ```bash
   npm install spacetimedb@latest
   ```
   Note: There's a newer TypeScript SDK available now!

2. **Generate Client Bindings**
   - Run SpacetimeDB code generation from your module
   - Creates TypeScript types for your tables and reducers
   - Allows type-safe queries

3. **Implement WebSocket Connection Manager**
   - Replace CLI calls with SDK connections
   - Maintain persistent WebSocket connection
   - Handle real-time subscriptions

4. **Update Connection Manager**
   ```typescript
   // Store BOTH URIs
   this.connectionState = {
     wsUri: uri,              // wss://... for SDK WebSocket
     httpUri: cliUri,         // http://... for CLI (if still needed)
     sdkConnection: connection, // Actual SDK connection object
     // ...
   }
   ```

5. **Reimplement Data Operations**
   - `queryTable()` - Use SDK to query via WebSocket
   - `callReducer()` - Use SDK to invoke reducers
   - `subscribeTable()` - Use SDK for real subscriptions
   - `executeSQL()` - May need SDK support

### Reference Implementation Pattern

```typescript
// Example of how SDK-based query would work
import { SpacetimeDBClient } from 'spacetimedb';

const client = new SpacetimeDBClient();
await client.connect(wsUri, moduleName);

// Query table
const users = await client.query('user');

// Call reducer
await client.call('send_message', ['Hello world!']);

// Subscribe
client.subscribe('SELECT * FROM message', (rows) => {
  console.log('New messages:', rows);
});
```

---

## How to Use (Current State)

### 1. Start Claude Desktop

Claude Desktop automatically loads the MCP server from the config file.

### 2. Connect to Your Database

In Claude Desktop, say:
```
Connect to my SpacetimeDB at wss://api.fractaloutlook.com:3000
with module name status-module
```

Claude will use the `spacetimedb_connect` tool.

### 3. Discover Tables

```
What tables do I have?
List all my tables
Show me the database structure
```

Claude will use `spacetimedb_list_tables`.

### 4. Discover Reducers

```
What reducers are available?
List all the server functions
```

Claude will use `spacetimedb_list_reducers`.

### 5. What DOESN'T Work Yet

❌ "Show me the users" - Query fails
❌ "Call the send_message reducer" - Untested/broken
❌ "Subscribe to the message table" - Subscription fails

---

## Testing Notes

### Manual CLI Test (Works)
```bash
# From Windows command line
spacetime describe status-module --json --server http://api.fractaloutlook.com:3000
```
This works! Returns full schema with 8 tables and 15 reducers.

### Manual SSH Test (Works)
```bash
# SSH to server
ssh -i "D:\keys\newdualsys.key" ubuntu@64.181.202.3

# On server
spacetime sql status-module "SELECT * FROM user" --server http://localhost:3000
```
This works when run ON the server.

### Remote SQL Test (Fails)
```bash
# From Windows, trying to query remote
spacetime sql status-module "SELECT * FROM user" --server http://api.fractaloutlook.com:3000
```
Fails with: `Error: Unsupported: SELECT * FROM user`

**Conclusion:** The HTTP API doesn't support arbitrary SQL queries from remote CLI. Need SDK.

---

## File Locations Reference

### Project Files
- Source code: `E:\AI\claude\spacetimedb-mcp-server\src\`
- Built code: `E:\AI\claude\spacetimedb-mcp-server\dist\`
- Config: `E:\AI\claude\spacetimedb-mcp-server\package.json`

### Claude Desktop
- Config: `C:\Users\USER\AppData\Roaming\Claude\claude_desktop_config.json`
- Logs: `C:\Users\USER\AppData\Roaming\Claude\logs\`
- MCP Server Log: `C:\Users\USER\AppData\Roaming\Claude\logs\mcp-server-spacetimedb.log`

### Keys
- SSH Key: `D:\keys\newdualsys.key`
- Key for Oracle: `D:\keys\newdualsys.key` (fixed permissions)

---

## Commands Reference

### Build & Deploy
```bash
# Build TypeScript
npm run build

# Watch mode (auto-rebuild)
npm run watch

# Test server
node dist/index.js
```

### Restart Claude Desktop
1. Right-click Claude in system tray
2. Click "Quit"
3. Reopen Claude Desktop

Or:
- Task Manager → End "Claude" process
- Reopen

### Check Logs
```bash
tail -100 "C:\Users\USER\AppData\Roaming\Claude\logs\mcp-server-spacetimedb.log"
```

### Test CLI Connection
```bash
spacetime describe status-module --json --server http://api.fractaloutlook.com:3000
```

---

## Debugging Tips

### Check if MCP Server is Loaded
Look in Claude Desktop logs:
```
2025-11-07T05:21:00.171Z [spacetimedb] [info] Server started and connected successfully
```

### Check for Errors
```bash
# Windows
type "C:\Users\USER\AppData\Roaming\Claude\logs\mcp-server-spacetimedb.log" | findstr error

# Git Bash
tail -100 "C:\Users\USER\AppData\Roaming\Claude\logs\mcp-server-spacetimedb.log" | grep error
```

### Common Issues

1. **"Invalid protocol: wss"**
   - Fixed: Now converts wss:// → http://

2. **"The token supplied to the function is invalid"**
   - SSL error trying to use https:// when server uses http://
   - Fixed: Now converts wss:// → http:// (not https://)

3. **"Unsupported: SELECT * FROM..."**
   - Remote HTTP API doesn't support SQL queries
   - Need: SDK implementation

---

## Success Metrics

### What We Achieved ✅
- [x] Created working MCP server
- [x] Successfully connects to remote SpacetimeDB
- [x] Discovers all 8 tables
- [x] Discovers all 15 reducers
- [x] Proper protocol conversion (wss → http)
- [x] Upgraded SpacetimeDB CLI to 1.7.0
- [x] Fixed SSH key permissions
- [x] Configured Claude Desktop integration
- [x] JSON parsing for CLI responses

### What's Left ❌
- [ ] Query table data (needs SDK)
- [ ] Call reducers (needs SDK)
- [ ] Real-time subscriptions (needs SDK)
- [ ] Execute SQL queries (needs SDK)
- [ ] Full schema details (may need SDK)

---

## Resources

### Documentation
- [SpacetimeDB Docs](https://spacetimedb.com/docs)
- [SpacetimeDB TypeScript SDK](https://spacetimedb.com/docs/sdks/typescript)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop MCP Integration](https://docs.anthropic.com/claude/docs/mcp)

### Your Server
- Server Rust Code: `~/status-module/lib.rs` (on Oracle VM)
- Deploy Script: `repubserver` (on Windows PATH)
- SSH Command: `ssh -i "D:\keys\newdualsys.key" ubuntu@64.181.202.3`

### GitHub Repos
- SpacetimeDB: https://github.com/clockworklabs/SpacetimeDB
- SpacetimeDB TypeScript SDK: https://github.com/clockworklabs/spacetimedb-typescript-sdk

---

## Future Enhancements

### Phase 2: Full SDK Implementation
1. Install latest TypeScript SDK
2. Generate client bindings from your module
3. Implement WebSocket connection manager
4. Replace CLI calls with SDK calls
5. Add real-time subscription support
6. Add reducer invocation support
7. Add proper error handling

### Phase 3: Advanced Features
- Connection pooling
- Automatic reconnection
- Transaction support
- Batch operations
- Performance optimizations
- Better schema introspection
- Export/import capabilities

### Phase 4: Developer Experience
- Auto-generate bindings on connect
- Better error messages
- Progress indicators
- Connection health monitoring
- Query result caching
- Offline mode support

---

## Session Timeline

1. ✅ Project setup and initial MCP server structure
2. ✅ Fixed package.json dependencies (spacetimedb SDK name)
3. ✅ Built and tested MCP server basic functionality
4. ✅ Configured Claude Desktop integration
5. ✅ Debugged protocol conversion issues (wss → http)
6. ✅ Upgraded SpacetimeDB CLI from 1.0.0 to 1.7.0
7. ✅ Fixed SSH key permissions for Oracle VM access
8. ✅ Added --json flag for CLI compatibility
9. ✅ Implemented JSON parsing for describe commands
10. ✅ Successfully discovered all tables and reducers
11. ❌ Discovered data query limitations (needs SDK)
12. 📝 Documented everything for future work

---

## Final Notes

**Great progress today!** We built a working MCP server that successfully:
- Connects to your remote SpacetimeDB instance
- Discovers your database structure (8 tables, 15 reducers)
- Integrates with Claude Desktop

**The limitation:** CLI-based approach can only do discovery, not data operations. To actually query data, call reducers, or set up subscriptions, we need to implement the SpacetimeDB TypeScript SDK with real WebSocket connections.

**When you're ready to continue:** Start with Phase 2 - installing the latest SDK and implementing WebSocket-based data operations. The foundation is solid!

---

*End of Session Notes*
