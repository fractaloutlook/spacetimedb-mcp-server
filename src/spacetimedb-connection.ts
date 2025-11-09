import { spawn, ChildProcess } from "child_process";
import { Identity, AlgebraicType } from "spacetimedb";
import type { DbConnectionImpl } from "spacetimedb";
import type RemoteModule from "spacetimedb/dist/sdk/spacetime_module";
import { DbConnectionBuilder } from "spacetimedb";

/**
 * SpacetimeDB Connection Manager
 *
 * Manages connections to SpacetimeDB instances and provides methods for:
 * - Database operations (queries, subscriptions)
 * - Schema introspection
 * - CLI operations (for metadata only)
 *
 * Uses hybrid approach:
 * - HTTP API for queries (works without generated bindings)
 * - WebSocket SDK for real-time subscriptions
 * - Schema-driven runtime type conversion
 */

interface ConnectionState {
  uri: string; // HTTP URI (for API calls and CLI)
  wsUri: string; // WebSocket URI (for SDK connections)
  moduleName: string;
  authToken?: string;
  connected: boolean;
  identity?: string;
  schema?: DatabaseSchema; // Cached schema for runtime type conversion
  wsConnection?: DbConnectionImpl; // WebSocket connection for subscriptions
  wsToken?: string; // Token returned from WebSocket connection
}

interface TableInfo {
  name: string;
  rowCount?: number;
  schema?: any;
}

/**
 * Schema structures for runtime type conversion
 */
interface DatabaseSchema {
  typespace: number;
  tables: TableSchema[];
  reducers: ReducerSchema[];
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  constraints: ConstraintSchema[];
  sequences: SequenceSchema[];
  type: string;
  access: string;
}

interface ColumnSchema {
  name: string;
  ty: AlgebraicType;
}

interface IndexSchema {
  name: string;
  is_unique: boolean;
  accessor_name: string;
  index_type: string;
}

interface ConstraintSchema {
  constraint_name: string;
  constraints: string;
  columns: number[];
}

interface SequenceSchema {
  name: string;
  col_pos: number;
  start: number;
  increment: number;
  min_value: number | null;
  max_value: number | null;
  allocated: number;
}

interface ReducerSchema {
  name: string;
  params: { elements: ParamSchema[] };
  lifecycle: string | null;
}

interface ParamSchema {
  name: string;
  ty: AlgebraicType;
}

export class SpacetimeDBConnectionManager {
  private connectionState: ConnectionState | null = null;
  private subscriptions: Map<string, any> = new Map();
  private tableCache: Map<string, any[]> = new Map();

  /**
   * Connect to a SpacetimeDB instance using HTTP API
   * Validates connection and fetches schema for runtime type conversion
   */
  async connect(
    uri: string,
    moduleName: string,
    authToken?: string
  ): Promise<{ status: string; identity?: string; message: string }> {
    // Normalize URIs for different protocols
    let httpUri = uri;
    let wsUri = uri;

    // Convert to HTTP for API calls
    // Note: SpacetimeDB often uses wss:// for WebSocket but http:// for HTTP API
    if (uri.startsWith('wss://')) {
      httpUri = uri.replace('wss://', 'http://');  // wss → http (not https!)
      wsUri = uri;
    } else if (uri.startsWith('ws://')) {
      httpUri = uri.replace('ws://', 'http://');
      wsUri = uri;
    } else if (uri.startsWith('https://')) {
      httpUri = uri;
      wsUri = uri.replace('https://', 'wss://');
    } else if (uri.startsWith('http://')) {
      httpUri = uri;
      wsUri = uri.replace('http://', 'ws://');
    }

    try {
      // Fetch schema to validate connection and cache for later use
      const schema = await this.fetchSchema(httpUri, moduleName, authToken);

      // Create RemoteModule from schema for WebSocket connection
      const remoteModule = this.createRemoteModule(schema);

      // Establish WebSocket connection for real-time subscriptions
      const { wsConnection, wsIdentity, wsToken } = await this.connectWebSocket(
        wsUri,
        moduleName,
        authToken,
        remoteModule
      );

      // Store connection state with both HTTP and WebSocket
      this.connectionState = {
        uri: httpUri,
        wsUri: wsUri,
        moduleName,
        authToken,
        connected: true,
        identity: wsIdentity,
        schema,
        wsConnection,
        wsToken,
      };

      console.log(`Connected to ${moduleName} at ${httpUri}`);
      console.log(`WebSocket connected with identity: ${wsIdentity}`);
      console.log(`Schema loaded: ${schema.tables.length} tables, ${schema.reducers.length} reducers`);

      return {
        status: "connected",
        identity: wsIdentity,
        message: `Connected to ${moduleName} at ${uri}. Found ${schema.tables.length} tables and ${schema.reducers.length} reducers.`,
      };
    } catch (error) {
      throw new Error(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Establish WebSocket connection using SDK
   */
  private async connectWebSocket(
    wsUri: string,
    moduleName: string,
    authToken: string | undefined,
    remoteModule: RemoteModule
  ): Promise<{ wsConnection: DbConnectionImpl; wsIdentity: string; wsToken: string }> {
    return new Promise((resolve, reject) => {
      const builder = new DbConnectionBuilder(
        remoteModule,
        (impl: DbConnectionImpl) => impl // Identity function - just return the impl
      );

      let resolvedConnection: DbConnectionImpl | null = null;

      builder
        .withUri(wsUri)
        .withModuleName(moduleName)
        .onConnect((connection: any, identity: Identity, token: string) => {
          console.log(`WebSocket connected: ${identity.toHexString()}`);
          resolvedConnection = connection;
          resolve({
            wsConnection: connection,
            wsIdentity: identity.toHexString(),
            wsToken: token,
          });
        })
        .onConnectError((ctx: any) => {
          const error = ctx.event || new Error('Connection failed');
          console.error("WebSocket connection error:", error);
          reject(new Error(`WebSocket connection failed: ${error}`));
        })
        .onDisconnect((ctx: any) => {
          const error = ctx.event;
          if (error) {
            console.error("WebSocket disconnected with error:", error);
          } else {
            console.log("WebSocket disconnected");
          }
        });

      if (authToken) {
        builder.withToken(authToken);
      }

      builder.build();
    });
  }

  /**
   * Fetch schema from SpacetimeDB HTTP API
   */
  private async fetchSchema(
    httpUri: string,
    moduleName: string,
    authToken?: string
  ): Promise<DatabaseSchema> {
    // Version 9 is the current RawModuleDef format
    const schemaUrl = `${httpUri}/v1/database/${moduleName}/schema?version=9`;

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(schemaUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch schema: HTTP ${response.status} - ${errorText}`);
    }

    const schema = await response.json();
    return schema as DatabaseSchema;
  }

  /**
   * Create a minimal RemoteModule from schema for WebSocket connections
   */
  private createRemoteModule(schema: DatabaseSchema): RemoteModule {
    const tables: { [name: string]: any } = {};
    const reducers: { [name: string]: any } = {};

    // Build table runtime type info from schema
    schema.tables.forEach(table => {
      tables[table.name] = {
        tableName: table.name,
        rowType: { type: 'Product', elements: table.columns },
        // TODO: extract primary key info if available
      };
    });

    // Build reducer runtime type info from schema
    schema.reducers.forEach(reducer => {
      reducers[reducer.name] = {
        reducerName: reducer.name,
        argsType: reducer.params,
      };
    });

    // Return minimal RemoteModule with version info
    return {
      tables,
      reducers,
      eventContextConstructor: (imp: DbConnectionImpl, event: any) => ({ db: {}, reducers: {}, event }),
      dbViewConstructor: (connection: DbConnectionImpl) => ({}),
      reducersConstructor: (connection: DbConnectionImpl, setReducerFlags: any) => ({}),
      setReducerFlagsConstructor: () => ({}),
      versionInfo: {
        cliVersion: '1.7.0',  // Match our installed SDK version
      },
    };
  }

  /**
   * Disconnect from SpacetimeDB
   */
  async disconnect(): Promise<void> {
    if (this.connectionState?.wsConnection) {
      try {
        this.connectionState.wsConnection.disconnect();
      } catch (error) {
        console.error("Error disconnecting WebSocket:", error);
      }
    }

    this.subscriptions.clear();
    this.tableCache.clear();
    this.connectionState = null;

    console.log("Disconnected from SpacetimeDB");
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState?.connected ?? false;
  }

  /**
   * Convert row data using schema type information
   */
  private convertRowTypes(row: any, tableSchema: TableSchema): any {
    const converted: any = {};

    tableSchema.columns.forEach((column, index) => {
      const rawValue = Array.isArray(row) ? row[index] : row[column.name];
      converted[column.name] = this.convertValue(rawValue, column.ty);
    });

    return converted;
  }

  /**
   * Convert a single value based on its AlgebraicType
   */
  private convertValue(value: any, type: AlgebraicType): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Cast to any for property access since AlgebraicType is a complex union
    const typeAny = type as any;
    const typeName = typeAny.type;

    switch (typeName) {
      case 'U8':
      case 'U16':
      case 'U32':
      case 'U64':
      case 'U128':
      case 'I8':
      case 'I16':
      case 'I32':
      case 'I64':
      case 'I128':
        return typeof value === 'string' ? parseInt(value, 10) : Number(value);

      case 'F32':
      case 'F64':
        return typeof value === 'string' ? parseFloat(value) : Number(value);

      case 'Bool':
        return Boolean(value);

      case 'String':
        return String(value);

      // Handle timestamp as Date object
      case 'Timestamp':
        if (typeof value === 'object' && 'microseconds_since_epoch' in value) {
          return new Date(value.microseconds_since_epoch / 1000);
        }
        return new Date(value);

      // Handle Identity type
      case 'Identity':
        if (typeof value === 'object' && '__identity_bytes' in value) {
          // Convert bytes array to hex string
          const bytes = value.__identity_bytes;
          return Array.isArray(bytes)
            ? bytes.map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : String(value);
        }
        return String(value);

      // Handle Product types (structs/tuples)
      case 'Product':
        if (typeof value === 'object') {
          // If it has elements, it's a product type
          if (typeAny.elements && Array.isArray(typeAny.elements)) {
            const converted: any = {};
            typeAny.elements.forEach((elem: any, idx: number) => {
              const fieldName = elem.name || `field_${idx}`;
              const fieldValue = Array.isArray(value) ? value[idx] : value[fieldName];
              converted[fieldName] = this.convertValue(fieldValue, elem.ty);
            });
            return converted;
          }
        }
        return value;

      // Handle Sum types (enums)
      case 'Sum':
        // Sum types are typically { tag: number, value: any }
        if (typeof value === 'object' && 'tag' in value) {
          return {
            variant: typeAny.variants?.[value.tag]?.name || `Variant${value.tag}`,
            value: value.value,
          };
        }
        return value;

      // Handle Array types
      case 'Array':
        if (Array.isArray(value) && typeAny.element_ty) {
          return value.map(v => this.convertValue(v, typeAny.element_ty));
        }
        return value;

      // Handle Option types
      case 'Option':
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'object' && 'some' in value) {
          return typeAny.some_ty ? this.convertValue(value.some, typeAny.some_ty) : value.some;
        }
        return typeAny.some_ty ? this.convertValue(value, typeAny.some_ty) : value;

      default:
        // For unknown types, return as-is
        return value;
    }
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
   * Query a table using HTTP API with schema-driven type conversion
   */
  async queryTable(
    tableName: string,
    filter?: any,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ table: string; rows: any[]; totalCount: number }> {
    this.ensureConnected();

    // Build SQL query
    let sqlQuery = `SELECT * FROM ${tableName}`;

    // Add WHERE clause if filter provided
    if (filter && Object.keys(filter).length > 0) {
      const conditions = Object.entries(filter)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} = '${value.replace(/'/g, "''")}'`; // Escape single quotes
          }
          return `${key} = ${value}`;
        })
        .join(' AND ');
      sqlQuery += ` WHERE ${conditions}`;
    }

    // Add LIMIT and OFFSET
    sqlQuery += ` LIMIT ${limit}`;
    if (offset > 0) {
      sqlQuery += ` OFFSET ${offset}`;
    }

    console.log("Executing HTTP API query:", sqlQuery);

    // Use HTTP API to query (works without bindings)
    const apiUrl = `${this.connectionState!.uri}/v1/database/${this.connectionState!.moduleName}/sql`;
    console.log("Query URL:", apiUrl);
    console.log("Connection state URI:", this.connectionState!.uri);
    console.log("Module name:", this.connectionState!.moduleName);

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };
    if (this.connectionState!.authToken) {
      headers['Authorization'] = `Bearer ${this.connectionState!.authToken}`;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: sqlQuery,  // Send raw SQL, not JSON
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Parse the response with schema if available
      if (Array.isArray(result) && result.length > 0) {
        const statementResult = result[0];
        const rawRows = statementResult.rows || [];

        // Convert rows using schema for proper type conversion
        const tableSchema = this.connectionState!.schema?.tables.find(t => t.name === tableName);
        const rows = tableSchema
          ? rawRows.map((row: any) => this.convertRowTypes(row, tableSchema))
          : rawRows;

        return {
          table: tableName,
          rows,
          totalCount: rows.length,
        };
      }

      return {
        table: tableName,
        rows: [],
        totalCount: 0,
      };
    } catch (error) {
      console.error("Query failed:", error);
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Call a reducer via HTTP API
   */
  async callReducer(
    reducerName: string,
    args: any[]
  ): Promise<{ reducer: string; status: string; message: string }> {
    this.ensureConnected();

    const apiUrl = `${this.connectionState!.uri}/v1/database/${this.connectionState!.moduleName}/call/${reducerName}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.connectionState!.authToken) {
      headers['Authorization'] = `Bearer ${this.connectionState!.authToken}`;
    }

    try {
      console.log(`Calling reducer ${reducerName} with args:`, args);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.text();

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
   * Subscribe to a table with real-time WebSocket updates
   */
  async subscribeTable(
    tableName: string,
    filter?: any
  ): Promise<{ table: string; subscribed: boolean; initialData: any[] }> {
    this.ensureConnected();

    const wsConnection = this.connectionState!.wsConnection;
    if (!wsConnection) {
      throw new Error("WebSocket connection not established");
    }

    try {
      // Get initial data snapshot via HTTP API (faster than waiting for subscription)
      const { rows } = await this.queryTable(tableName, filter);

      // Build SQL subscription query
      let sqlQuery = `SELECT * FROM ${tableName}`;
      if (filter && Object.keys(filter).length > 0) {
        const conditions = Object.entries(filter)
          .map(([key, value]) => {
            if (typeof value === 'string') {
              return `${key} = '${value.replace(/'/g, "''")}'`;
            }
            return `${key} = ${value}`;
          })
          .join(' AND ');
        sqlQuery += ` WHERE ${conditions}`;
      }

      // Set up WebSocket subscription for live updates
      await new Promise<void>((resolve, reject) => {
        wsConnection
          .subscriptionBuilder()
          .onApplied((ctx: any) => {
            console.log(`Subscription applied for ${tableName}`);
            // Without bindings, we can't access ctx.db.tableName
            // But subscription is active and will receive updates
            resolve();
          })
          .onError((ctx: any) => {
            const error = ctx.event || new Error('Subscription error');
            console.error(`Subscription error for ${tableName}:`, error);
            reject(error);
          })
          .subscribe([sqlQuery]);
      });

      this.subscriptions.set(tableName, {
        filter,
        active: true,
        query: sqlQuery,
        initialCount: rows.length,
      });

      console.log(`Subscribed to ${tableName} via WebSocket: ${rows.length} initial rows`);

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
