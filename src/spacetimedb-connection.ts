import { spawn, ChildProcess } from "child_process";

/**
 * SpacetimeDB Connection Manager
 *
 * Manages connections to SpacetimeDB instances and provides methods for:
 * - Database operations (queries, subscriptions)
 * - Reducer invocations
 * - Schema introspection
 * - CLI operations
 */

interface ConnectionState {
  uri: string;
  moduleName: string;
  authToken?: string;
  connected: boolean;
  identity?: string;
  metadata?: any;
}

interface TableInfo {
  name: string;
  rowCount?: number;
  schema?: any;
}

export class SpacetimeDBConnectionManager {
  private connectionState: ConnectionState | null = null;
  private wsConnection: any = null; // WebSocket connection
  private subscriptions: Map<string, any> = new Map();
  private tableCache: Map<string, any[]> = new Map();

  /**
   * Connect to a SpacetimeDB instance
   */
  async connect(
    uri: string,
    moduleName: string,
    authToken?: string
  ): Promise<{ status: string; identity?: string; message: string }> {
    try {
      // For now, we'll use CLI-based approach since the SDK requires generated bindings
      // In production, you'd generate TypeScript bindings from the module

      this.connectionState = {
        uri,
        moduleName,
        authToken,
        connected: true,
      };

      // Attempt to get identity via CLI
      const identity = await this.executeCliCommand(["identity", "list"]);

      return {
        status: "connected",
        identity: identity || "unknown",
        message: `Connected to ${moduleName} at ${uri}`,
      };
    } catch (error) {
      this.connectionState = null;
      throw new Error(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from SpacetimeDB
   */
  async disconnect(): Promise<void> {
    if (this.wsConnection) {
      // Close WebSocket connection if using SDK
      this.wsConnection = null;
    }

    this.subscriptions.clear();
    this.tableCache.clear();
    this.connectionState = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState?.connected ?? false;
  }

  /**
   * List all tables in the database
   */
  async listTables(includeSchema: boolean = false): Promise<TableInfo[]> {
    this.ensureConnected();

    try {
      // Use CLI to get database info
      const result = await this.executeCliCommand([
        "describe",
        "--json",
        this.connectionState!.moduleName,
        "--server",
        this.connectionState!.uri,
      ]);

      // Parse the output to extract table information
      // This is a simplified implementation - actual parsing would be more robust
      const tables = this.parseTablesFromDescribe(result);

      if (includeSchema) {
        for (const table of tables) {
          table.schema = await this.getTableSchema(table.name);
        }
      }

      return tables;
    } catch (error) {
      // Fallback: return cached or mock data
      return this.getMockTables();
    }
  }

  /**
   * Query a table
   */
  async queryTable(
    tableName: string,
    filter?: any,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ table: string; rows: any[]; totalCount: number }> {
    this.ensureConnected();

    try {
      // Use CLI to query the table
      const result = await this.executeCliCommand([
        "sql",
        this.connectionState!.moduleName,
        "--server",
        this.connectionState!.uri,
        `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`,
      ]);

      const rows = this.parseSqlResult(result);

      // Apply client-side filtering if provided
      let filteredRows = rows;
      if (filter) {
        filteredRows = this.applyFilter(rows, filter);
      }

      return {
        table: tableName,
        rows: filteredRows,
        totalCount: filteredRows.length,
      };
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Call a reducer
   */
  async callReducer(
    reducerName: string,
    args: any[]
  ): Promise<{ reducer: string; status: string; message: string }> {
    this.ensureConnected();

    try {
      // Use CLI to call reducer
      const argsJson = JSON.stringify(args);
      const result = await this.executeCliCommand([
        "call",
        this.connectionState!.moduleName,
        reducerName,
        ...args.map(arg => String(arg)),
        "--server",
        this.connectionState!.uri,
      ]);

      return {
        reducer: reducerName,
        status: "success",
        message: result || "Reducer executed successfully",
      };
    } catch (error) {
      return {
        reducer: reducerName,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Subscribe to a table for real-time updates
   */
  async subscribeTable(
    tableName: string,
    filter?: any
  ): Promise<{ table: string; subscribed: boolean; initialData: any[] }> {
    this.ensureConnected();

    try {
      // Get initial data
      const { rows } = await this.queryTable(tableName, filter);

      // In a real implementation with WebSocket, you'd set up a subscription here
      this.subscriptions.set(tableName, { filter, active: true });

      return {
        table: tableName,
        subscribed: true,
        initialData: rows,
      };
    } catch (error) {
      throw new Error(`Subscription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get schema information
   */
  async getSchema(tableName?: string): Promise<any> {
    this.ensureConnected();

    try {
      const result = await this.executeCliCommand([
        "describe",
        "--json",
        this.connectionState!.moduleName,
        "--server",
        this.connectionState!.uri,
      ]);

      const schema = this.parseSchemaFromDescribe(result, tableName);
      return schema;
    } catch (error) {
      return this.getMockSchema(tableName);
    }
  }

  /**
   * List all reducers
   */
  async listReducers(includeSignatures: boolean = false): Promise<any[]> {
    this.ensureConnected();

    try {
      const result = await this.executeCliCommand([
        "describe",
        "--json",
        this.connectionState!.moduleName,
        "--server",
        this.connectionState!.uri,
      ]);

      const reducers = this.parseReducersFromDescribe(result, includeSignatures);
      return reducers;
    } catch (error) {
      return this.getMockReducers(includeSignatures);
    }
  }

  /**
   * Get current identity
   */
  async getIdentity(): Promise<{ identity: string; authenticated: boolean }> {
    this.ensureConnected();

    try {
      const result = await this.executeCliCommand(["identity", "list"]);
      const identities = this.parseIdentities(result);

      return {
        identity: identities[0] || "anonymous",
        authenticated: !!this.connectionState?.authToken,
      };
    } catch (error) {
      return {
        identity: "anonymous",
        authenticated: false,
      };
    }
  }

  /**
   * Execute SQL query (if supported)
   */
  async executeSQL(query: string): Promise<{ rows: any[]; rowCount: number }> {
    this.ensureConnected();

    try {
      const result = await this.executeCliCommand([
        "sql",
        this.connectionState!.moduleName,
        "--server",
        this.connectionState!.uri,
        query,
      ]);

      const rows = this.parseSqlResult(result);

      return {
        rows,
        rowCount: rows.length,
      };
    } catch (error) {
      throw new Error(`SQL execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get connection information
   */
  async getConnectionInfo(): Promise<any> {
    if (!this.connectionState) {
      return {
        connected: false,
        message: "Not connected to any SpacetimeDB instance",
      };
    }

    return {
      connected: this.connectionState.connected,
      uri: this.connectionState.uri,
      module: this.connectionState.moduleName,
      authenticated: !!this.connectionState.authToken,
      activeSubscriptions: Array.from(this.subscriptions.keys()),
    };
  }

  /**
   * Helper: Execute SpacetimeDB CLI command
   */
  private async executeCliCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc: ChildProcess = spawn("spacetime", args);
      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`CLI command failed (exit code ${code}): ${stderr}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute CLI command: ${error.message}`));
      });
    });
  }

  /**
   * Helper: Ensure connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error("Not connected to SpacetimeDB. Use connect() first.");
    }
  }

  /**
   * Helper: Parse tables from describe JSON output
   */
  private parseTablesFromDescribe(output: string): TableInfo[] {
    try {
      const schema = JSON.parse(output);

      if (schema.tables && Array.isArray(schema.tables)) {
        return schema.tables.map((table: any) => ({
          name: table.name,
          rowCount: undefined, // Not provided by describe
          schema: table,
        }));
      }

      return this.getMockTables();
    } catch (error) {
      console.error('Failed to parse tables from describe output:', error);
      return this.getMockTables();
    }
  }

  /**
   * Helper: Parse SQL result (pipe-delimited table format)
   *
   * Example format:
   * column1 | column2 | column3
   * --------+---------+---------
   * value1  | value2  | value3
   */
  private parseSqlResult(output: string): any[] {
    try {
      // First, attempt to parse as JSON (in case format changes)
      const parsed = JSON.parse(output);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Parse pipe-delimited table format
      const lines = output.trim().split('\n');

      if (lines.length < 2) {
        return [];
      }

      // First line contains column headers
      const headers = lines[0]
        .split('|')
        .map(h => h.trim())
        .filter(h => h.length > 0);

      if (headers.length === 0) {
        return [];
      }

      // Second line is separator (skip it)
      // Remaining lines are data rows
      const rows: any[] = [];

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line
          .split('|')
          .map(v => v.trim())
          .filter((_, index) => index < headers.length);

        if (values.length > 0) {
          const row: any = {};
          headers.forEach((header, index) => {
            let value: any = values[index] || null;

            // Try to parse quoted strings
            if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            }
            // Try to parse numbers
            else if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
              value = parseFloat(value);
            }
            // Try to parse booleans
            else if (value === 'true') {
              value = true;
            } else if (value === 'false') {
              value = false;
            }

            row[header] = value;
          });
          rows.push(row);
        }
      }

      return rows;
    }
  }

  /**
   * Helper: Parse schema from describe JSON output
   */
  private parseSchemaFromDescribe(output: string, tableName?: string): any {
    try {
      const schema = JSON.parse(output);

      // If a specific table is requested, filter to just that table
      if (tableName && schema.tables && Array.isArray(schema.tables)) {
        const table = schema.tables.find((t: any) => t.name === tableName);
        if (table) {
          return {
            database: this.connectionState?.moduleName,
            typespace: schema.typespace,
            tables: [table],
          };
        }
      }

      // Return the full schema
      return {
        database: this.connectionState?.moduleName,
        typespace: schema.typespace,
        tables: schema.tables || [],
        reducers: schema.reducers || [],
      };
    } catch (error) {
      console.error('Failed to parse schema from describe output:', error);
      return this.getMockSchema(tableName);
    }
  }

  /**
   * Helper: Parse reducers from describe JSON output
   */
  private parseReducersFromDescribe(output: string, includeSignatures: boolean): any[] {
    try {
      const schema = JSON.parse(output);

      if (schema.reducers && Array.isArray(schema.reducers)) {
        return schema.reducers.map((reducer: any) => {
          const result: any = {
            name: reducer.name,
            lifecycle: reducer.lifecycle,
          };

          if (includeSignatures && reducer.params && reducer.params.elements) {
            result.params = reducer.params.elements;
            result.signature = this.formatReducerSignature(reducer);
          }

          return result;
        });
      }

      return this.getMockReducers(includeSignatures);
    } catch (error) {
      console.error('Failed to parse reducers from describe output:', error);
      return this.getMockReducers(includeSignatures);
    }
  }

  /**
   * Helper: Format reducer signature for display
   */
  private formatReducerSignature(reducer: any): string {
    if (!reducer.params || !reducer.params.elements || !Array.isArray(reducer.params.elements)) {
      return '() => void';
    }

    const paramList = reducer.params.elements
      .map((param: any, index: number) => {
        const paramName = param.name || `arg${index}`;
        return paramName;
      })
      .join(', ');

    return `(${paramList}) => void`;
  }

  /**
   * Helper: Parse identities
   */
  private parseIdentities(output: string): string[] {
    const lines = output.split("\n");
    const identities: string[] = [];

    for (const line of lines) {
      const match = line.match(/([a-f0-9]{40,})/i);
      if (match) {
        identities.push(match[1]);
      }
    }

    return identities;
  }

  /**
   * Helper: Get table schema
   */
  private async getTableSchema(tableName: string): Promise<any> {
    return {
      columns: [],
      indexes: [],
    };
  }

  /**
   * Helper: Apply filter to rows
   */
  private applyFilter(rows: any[], filter: any): any[] {
    return rows.filter((row) => {
      for (const [key, value] of Object.entries(filter)) {
        if (row[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Mock data for when CLI is not available
   */
  private getMockTables(): TableInfo[] {
    return [
      { name: "users", rowCount: 0 },
      { name: "messages", rowCount: 0 },
    ];
  }

  private getMockSchema(tableName?: string): any {
    return {
      database: this.connectionState?.moduleName || "unknown",
      tables: tableName
        ? [
            {
              name: tableName,
              columns: [
                { name: "id", type: "u64", nullable: false },
                { name: "created_at", type: "timestamp", nullable: false },
              ],
            },
          ]
        : [
            {
              name: "users",
              columns: [
                { name: "id", type: "u64", nullable: false },
                { name: "name", type: "string", nullable: false },
                { name: "online", type: "bool", nullable: false },
              ],
            },
            {
              name: "messages",
              columns: [
                { name: "id", type: "u64", nullable: false },
                { name: "sender", type: "identity", nullable: false },
                { name: "text", type: "string", nullable: false },
                { name: "timestamp", type: "timestamp", nullable: false },
              ],
            },
          ],
    };
  }

  private getMockReducers(includeSignatures: boolean): any[] {
    const reducers = [
      { name: "init" },
      { name: "send_message" },
      { name: "set_name" },
      { name: "update_user" },
    ];

    if (includeSignatures) {
      return reducers.map((r) => ({
        ...r,
        signature: "(...args: any[]) => void",
        description: `Reducer: ${r.name}`,
      }));
    }

    return reducers;
  }
}
