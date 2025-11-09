<!-- Last updated: 2025-01-08 21:24 PST -->

# SpacetimeDB HTTP API Quick Reference

## Query Endpoints

### Execute SQL Query
```
POST /v1/database/:name_or_identity/sql
Content-Type: application/json
Authorization: Bearer <token> (optional)

Body: { "query": "SELECT * FROM table_name LIMIT 100" }

Returns: Array of statement results with schema and rows
```

### Get Schema
```
GET /v1/database/:name_or_identity/schema
Authorization: Bearer <token> (optional)

Returns: RawModuleDef with tables, reducers, types
```

### Call Reducer
```
POST /v1/database/:name_or_identity/call/:reducer_name
Content-Type: application/json
Authorization: Bearer <token> (optional)

Body: [arg1, arg2, ...] (JSON array of arguments)
```

### WebSocket Subscribe
```
GET /v1/database/:name_or_identity/subscribe
Upgrade: websocket
Sec-WebSocket-Protocol: v1.bsatn.spacetimedb OR v1.json.spacetimedb
```

See spacetimedb-http-api-database.md for full details.
