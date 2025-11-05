#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { SpacetimeDBConnectionManager } from "./spacetimedb-connection.js";

/**
 * SpacetimeDB MCP Server
 *
 * Provides comprehensive Model Context Protocol interface for SpacetimeDB:
 * - Connect to SpacetimeDB instances (local or cloud)
 * - Query tables and subscribe to real-time updates
 * - Call reducers (server-side functions)
 * - Manage database schemas and metadata
 * - Execute CLI operations
 */

const server = new Server(
  {
    name: "spacetimedb-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Connection manager singleton
const connectionManager = new SpacetimeDBConnectionManager();

/**
 * Tool Handlers
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "spacetimedb_connect",
        description: "Connect to a SpacetimeDB instance (local or cloud). Establishes connection for subsequent operations.",
        inputSchema: {
          type: "object",
          properties: {
            uri: {
              type: "string",
              description: "WebSocket URI of SpacetimeDB instance (e.g., 'ws://localhost:3000' or 'wss://testnet.spacetimedb.com')",
            },
            module_name: {
              type: "string",
              description: "Name of the SpacetimeDB module/database to connect to",
            },
            auth_token: {
              type: "string",
              description: "Optional authentication token for secure connections",
            },
          },
          required: ["uri", "module_name"],
        },
      },
      {
        name: "spacetimedb_disconnect",
        description: "Disconnect from the current SpacetimeDB instance",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "spacetimedb_list_tables",
        description: "List all tables in the connected SpacetimeDB module with their schemas",
        inputSchema: {
          type: "object",
          properties: {
            include_schema: {
              type: "boolean",
              description: "Include detailed schema information for each table",
              default: false,
            },
          },
        },
      },
      {
        name: "spacetimedb_query_table",
        description: "Query data from a specific table. Supports filtering and pagination.",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Name of the table to query",
            },
            filter: {
              type: "string",
              description: "Optional JSON filter expression (e.g., '{\"field\": \"value\"}' for equality)",
            },
            limit: {
              type: "number",
              description: "Maximum number of rows to return",
              default: 100,
            },
            offset: {
              type: "number",
              description: "Number of rows to skip",
              default: 0,
            },
          },
          required: ["table_name"],
        },
      },
      {
        name: "spacetimedb_call_reducer",
        description: "Call a reducer (server-side function) in the SpacetimeDB module. Reducers modify database state atomically.",
        inputSchema: {
          type: "object",
          properties: {
            reducer_name: {
              type: "string",
              description: "Name of the reducer to call",
            },
            args: {
              type: "string",
              description: "JSON array of arguments to pass to the reducer (e.g., '[\"value1\", 42, true]')",
            },
          },
          required: ["reducer_name", "args"],
        },
      },
      {
        name: "spacetimedb_subscribe_table",
        description: "Subscribe to a table for real-time updates. Returns current data and sets up live synchronization.",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Name of the table to subscribe to",
            },
            filter: {
              type: "string",
              description: "Optional JSON filter expression for subscription",
            },
          },
          required: ["table_name"],
        },
      },
      {
        name: "spacetimedb_get_schema",
        description: "Get detailed schema information for a specific table or the entire database",
        inputSchema: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Optional table name. If not provided, returns schema for all tables",
            },
          },
        },
      },
      {
        name: "spacetimedb_list_reducers",
        description: "List all available reducers (server-side functions) in the connected module",
        inputSchema: {
          type: "object",
          properties: {
            include_signatures: {
              type: "boolean",
              description: "Include detailed parameter signatures for each reducer",
              default: false,
            },
          },
        },
      },
      {
        name: "spacetimedb_get_identity",
        description: "Get the current client identity information (unique identifier for this connection)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "spacetimedb_execute_sql",
        description: "Execute a SQL query on the SpacetimeDB instance (if supported by the module)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "spacetimedb_get_connection_info",
        description: "Get current connection status and information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "spacetimedb_connect": {
        const { uri, module_name, auth_token } = args as {
          uri: string;
          module_name: string;
          auth_token?: string;
        };

        const result = await connectionManager.connect(uri, module_name, auth_token);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_disconnect": {
        await connectionManager.disconnect();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: "disconnected" }, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_list_tables": {
        const { include_schema = false } = args as { include_schema?: boolean };
        const tables = await connectionManager.listTables(include_schema);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tables, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_query_table": {
        const { table_name, filter, limit = 100, offset = 0 } = args as {
          table_name: string;
          filter?: string;
          limit?: number;
          offset?: number;
        };

        const parsedFilter = filter ? JSON.parse(filter) : undefined;
        const result = await connectionManager.queryTable(
          table_name,
          parsedFilter,
          limit,
          offset
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_call_reducer": {
        const { reducer_name, args: reducerArgs } = args as {
          reducer_name: string;
          args: string;
        };

        const parsedArgs = JSON.parse(reducerArgs);
        const result = await connectionManager.callReducer(reducer_name, parsedArgs);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_subscribe_table": {
        const { table_name, filter } = args as {
          table_name: string;
          filter?: string;
        };

        const parsedFilter = filter ? JSON.parse(filter) : undefined;
        const result = await connectionManager.subscribeTable(table_name, parsedFilter);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_get_schema": {
        const { table_name } = args as { table_name?: string };
        const schema = await connectionManager.getSchema(table_name);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_list_reducers": {
        const { include_signatures = false } = args as { include_signatures?: boolean };
        const reducers = await connectionManager.listReducers(include_signatures);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(reducers, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_get_identity": {
        const identity = await connectionManager.getIdentity();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(identity, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_execute_sql": {
        const { query } = args as { query: string };
        const result = await connectionManager.executeSQL(query);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "spacetimedb_get_connection_info": {
        const info = await connectionManager.getConnectionInfo();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
  }
});

/**
 * Resource Handlers
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const isConnected = connectionManager.isConnected();

  if (!isConnected) {
    return { resources: [] };
  }

  try {
    const tables = await connectionManager.listTables(false);
    const resources = tables.map((table: any) => ({
      uri: `spacetimedb://tables/${table.name}`,
      name: `Table: ${table.name}`,
      description: `Access data from the ${table.name} table`,
      mimeType: "application/json",
    }));

    resources.push({
      uri: "spacetimedb://schema",
      name: "Database Schema",
      description: "Complete database schema information",
      mimeType: "application/json",
    });

    resources.push({
      uri: "spacetimedb://reducers",
      name: "Available Reducers",
      description: "List of all callable reducers",
      mimeType: "application/json",
    });

    return { resources };
  } catch (error) {
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!connectionManager.isConnected()) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Not connected to SpacetimeDB. Use spacetimedb_connect first."
    );
  }

  if (uri.startsWith("spacetimedb://tables/")) {
    const tableName = uri.replace("spacetimedb://tables/", "");
    const data = await connectionManager.queryTable(tableName, undefined, 100, 0);

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (uri === "spacetimedb://schema") {
    const schema = await connectionManager.getSchema();

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  if (uri === "spacetimedb://reducers") {
    const reducers = await connectionManager.listReducers(true);

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(reducers, null, 2),
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.InvalidRequest,
    `Unknown resource: ${uri}`
  );
});

/**
 * Start server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SpacetimeDB MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
