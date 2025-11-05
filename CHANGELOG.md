# Changelog

All notable changes to the SpacetimeDB MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-03

### Added

#### Core Functionality
- Complete MCP server implementation for SpacetimeDB
- Support for local and cloud SpacetimeDB instances
- Connection management with authentication
- 11 comprehensive MCP tools for database operations
- 3 MCP resource types (tables, schema, reducers)

#### Tools
- `spacetimedb_connect` - Connect to SpacetimeDB instances
- `spacetimedb_disconnect` - Disconnect from current instance
- `spacetimedb_list_tables` - List all database tables
- `spacetimedb_query_table` - Query tables with filtering and pagination
- `spacetimedb_call_reducer` - Invoke server-side reducers
- `spacetimedb_subscribe_table` - Real-time table subscriptions
- `spacetimedb_get_schema` - Database and table schema introspection
- `spacetimedb_list_reducers` - List available reducers
- `spacetimedb_get_identity` - Get client identity information
- `spacetimedb_execute_sql` - Execute SQL queries
- `spacetimedb_get_connection_info` - Get connection status

#### Documentation
- Comprehensive README with features and installation
- QUICKSTART guide for 5-minute setup
- Detailed USAGE guide with tool reference
- EXAMPLES with real-world use cases (games, chat, IoT, dashboards)
- CONTRIBUTING guide for developers
- Cross-platform support with Bash and Windows CMD instructions

#### Architecture
- TypeScript implementation with strict typing
- Dual CLI/SDK approach for flexibility
- Hybrid connection management
- Production-ready error handling
- Support for WebSocket connections
- CLI command execution for operations

#### Configuration
- Environment variable support
- Claude Desktop configuration examples
- Example configuration files

#### Developer Experience
- Full TypeScript support
- Hot reload development mode
- Watch mode for continuous building
- Comprehensive JSDoc comments
- MIT license

### Technical Details

**Languages:**
- TypeScript (ES2022)
- Node.js 18.0.0+

**Dependencies:**
- @modelcontextprotocol/sdk ^1.0.4
- spacetimedb-sdk ^1.0.0
- zod ^3.23.8

**Development:**
- TypeScript strict mode
- ES2022 target
- Source maps enabled

### Platform Support
- Windows (PowerShell and CMD)
- Linux (Bash)
- macOS (Bash)

### Use Cases
- Multiplayer game backends
- Real-time chat applications
- Collaborative document editing
- IoT device monitoring
- Admin dashboards
- Leaderboards and scoring systems

---

## Future Enhancements (Planned)

### High Priority
- WebSocket connection pooling
- Automatic binding generation
- Enhanced error handling with retries
- Streaming results for large datasets

### Medium Priority
- Transaction support
- Advanced subscription filtering
- Performance optimization
- Better CLI output parsing

### Low Priority
- Metrics and monitoring
- Debug mode
- Query builder
- Schema migration helpers

---

[1.0.0]: https://github.com/yourusername/spacetimedb-mcp-server/releases/tag/v1.0.0
