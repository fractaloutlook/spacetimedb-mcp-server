# SpacetimeDB MCP Server - Quick Start Guide

Get up and running with SpacetimeDB MCP Server in 5 minutes!

## Prerequisites Check

Before starting, verify you have:

**Bash/PowerShell/CMD:**
```bash
# Check Node.js (need 18.0.0+)
node --version

# Check if SpacetimeDB CLI is installed
spacetime --version
```

If SpacetimeDB is not installed:

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
rem Download and run the installer from https://spacetimedb.com/install
rem Or use PowerShell for automated installation
```

## Installation

### Step 1: Get the MCP Server

**Bash/PowerShell/CMD:**
```bash
cd E:\AI\claude\spacetimedb-mcp-server
npm install
npm run build
```

**Windows CMD (if path has spaces):**
```cmd
cd /d "E:\AI\claude\spacetimedb-mcp-server"
npm install
npm run build
```

### Step 2: Configure Claude Desktop

Add to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spacetimedb": {
      "command": "node",
      "args": ["E:\\AI\\claude\\spacetimedb-mcp-server\\dist\\index.js"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

## First Steps

### 1. Start SpacetimeDB Locally

```bash
spacetime start
```

This starts SpacetimeDB on `ws://localhost:3000`.

### 2. Deploy a Test Module

Create a simple test module or use the quickstart:

**Bash:**
```bash
# Follow SpacetimeDB quickstart
spacetime quickstart rust quickstart-chat
cd quickstart-chat
spacetime publish quickstart-chat --clear-database
```

**Windows CMD:**
```cmd
rem Follow SpacetimeDB quickstart
spacetime quickstart rust quickstart-chat
cd quickstart-chat
spacetime publish quickstart-chat --clear-database
```

### 3. Connect from Claude

In Claude Desktop, you can now use:

```
Connect to my local SpacetimeDB instance at ws://localhost:3000 with module quickstart-chat
```

Claude will execute:
```typescript
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "quickstart-chat"
})
```

### 4. Explore Your Database

```
Show me all tables in the database
```

```
What reducers are available?
```

```
Query the users table
```

### 5. Interact with Data

```
Call the set_name reducer with argument "Alice"
```

```
Subscribe to the messages table
```

```
Get the schema for the users table
```

## Common Commands

| Natural Language | What It Does |
|-----------------|--------------|
| "Connect to SpacetimeDB at ws://localhost:3000 module my-game" | Connects to local instance |
| "List all tables" | Shows all tables in database |
| "Query the users table" | Gets data from users table |
| "Show me the schema" | Displays database schema |
| "What reducers are available?" | Lists all callable functions |
| "Call set_name with 'Alice'" | Invokes a reducer |
| "Subscribe to players table" | Sets up real-time updates |
| "Execute SQL: SELECT * FROM users" | Runs SQL query |

## Example Session

```
You: Connect to ws://localhost:3000 module quickstart-chat

Claude: ✓ Connected to quickstart-chat
Identity: abc123...

You: What tables exist?

Claude: Found 2 tables:
- users (3 columns)
- messages (4 columns)

You: Show me recent messages

Claude: [Displays message data]

You: Send a message saying "Hello!"

Claude: Calling reducer send_message("Hello!", "general")
✓ Message sent successfully

You: Subscribe to new messages

Claude: ✓ Subscribed to messages table
You'll receive updates as new messages arrive
```

## Troubleshooting

### Issue: "spacetime command not found"

**Solution:**

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
rem Visit https://spacetimedb.com/install and download the installer
rem Or use PowerShell for automated installation
```

### Issue: "Connection refused"

**Solution:**

**Bash:**
```bash
# Make sure SpacetimeDB is running
spacetime start

# Check it's accessible (Linux/macOS)
curl http://localhost:3000
```

**Windows CMD:**
```cmd
rem Make sure SpacetimeDB is running
spacetime start

rem Check it's accessible
curl http://localhost:3000
```

Or open http://localhost:3000 in your browser.

### Issue: "Module not found"

**Solution:**

**Bash:**
```bash
# List available modules
spacetime list

# Publish your module
spacetime publish my-module --project-path ./my-module
```

**Windows CMD:**
```cmd
rem List available modules
spacetime list

rem Publish your module
spacetime publish my-module --project-path ./my-module
```

### Issue: MCP server not appearing in Claude

**Solution:**
1. Check config file path is correct
2. Verify JSON syntax is valid
3. Restart Claude Desktop completely
4. Check Claude logs for errors

## Next Steps

### Learn More

- [Full Documentation](README.md)
- [Detailed Usage Guide](USAGE.md)
- [Code Examples](EXAMPLES.md)
- [SpacetimeDB Docs](https://spacetimedb.com/docs)

### Build Your Own Module

1. Create a new SpacetimeDB module:

   **Bash:**
   ```bash
   spacetime quickstart rust my-app
   cd my-app
   ```

   **Windows CMD:**
   ```cmd
   spacetime quickstart rust my-app
   cd my-app
   ```

2. Edit `src/lib.rs` to define your schema and reducers

3. Publish your module:

   **Bash/CMD:**
   ```bash
   spacetime publish my-app
   ```

4. Connect and interact via Claude:
   ```
   Connect to ws://localhost:3000 module my-app
   ```

### Use Cases to Try

- **Chat Application**: Build a real-time chat
- **Game Backend**: Create a multiplayer game server
- **Todo App**: Make a collaborative todo list
- **Dashboard**: Monitor IoT devices
- **Leaderboard**: Track high scores

## Example: Building a Simple Counter

### 1. Create Module (`src/lib.rs`)

```rust
use spacetimedb::{table, reducer, ReducerContext, SpacetimeType};

#[table(name = counter)]
pub struct Counter {
    #[primarykey]
    pub id: u32,
    pub value: i64,
}

#[reducer]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    ctx.db.counter().insert(Counter { id: 0, value: 0 })?;
    Ok(())
}

#[reducer]
pub fn increment(ctx: &ReducerContext) -> Result<(), String> {
    let counter = ctx.db.counter().filter(|c| c.id == 0).first().unwrap();
    ctx.db.counter().update(Counter {
        value: counter.value + 1,
        ..counter
    })?;
    Ok(())
}
```

### 2. Publish Module

**Bash/CMD:**
```bash
spacetime publish counter --clear-database
```

### 3. Use from Claude

```
Connect to ws://localhost:3000 module counter

Initialize the counter by calling the init reducer

Query the counter table

Increment the counter 5 times

Query the counter again to see the new value
```

## Production Deployment

For production use:

1. **Use Cloud Instance**
   ```
   Connect to wss://testnet.spacetimedb.com module my-prod-app with auth token [your-token]
   ```

2. **Add Authentication**

   **Bash/CMD:**
   ```bash
   spacetime login
   spacetime identity create
   ```

3. **Secure Your Connection**
   - Use WSS (WebSocket Secure)
   - Add authentication tokens
   - Implement row-level security in your module

## Getting Help

- **Discord**: [discord.gg/spacetimedb](https://discord.gg/spacetimedb)
- **GitHub**: [github.com/clockworklabs/SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB)
- **Documentation**: [spacetimedb.com/docs](https://spacetimedb.com/docs)

## Success!

You're now ready to use SpacetimeDB with Claude! Try building something awesome! 🚀

---

**Need more details?** Check out [README.md](README.md) for comprehensive documentation.
