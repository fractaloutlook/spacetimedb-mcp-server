# SpacetimeDB MCP Server - Examples

This document provides complete, real-world examples of using the SpacetimeDB MCP Server.

## Table of Contents

1. [Multiplayer Game Example](#multiplayer-game-example)
2. [Chat Application Example](#chat-application-example)
3. [Real-time Leaderboard](#real-time-leaderboard)
4. [Collaborative Document Editor](#collaborative-document-editor)
5. [IoT Device Monitoring](#iot-device-monitoring)
6. [Admin Dashboard](#admin-dashboard)

---

## Multiplayer Game Example

### SpacetimeDB Module (Rust)

```rust
// server/src/lib.rs
use spacetimedb::{table, reducer, Identity, ReducerContext, SpacetimeType, Timestamp};

#[derive(SpacetimeType)]
#[table(name = players)]
pub struct Player {
    #[primarykey]
    pub identity: Identity,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub health: u32,
    pub score: u32,
    pub online: bool,
    pub last_active: Timestamp,
}

#[derive(SpacetimeType)]
#[table(name = game_events)]
pub struct GameEvent {
    #[autoinc]
    #[primarykey]
    pub id: u64,
    pub event_type: String,
    pub player: Identity,
    pub data: String,
    pub timestamp: Timestamp,
}

#[reducer]
pub fn spawn_player(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let player = Player {
        identity: ctx.sender,
        name,
        x: 0.0,
        y: 0.0,
        health: 100,
        score: 0,
        online: true,
        last_active: Timestamp::now(),
    };
    ctx.db.players().insert(player)?;
    Ok(())
}

#[reducer]
pub fn move_player(ctx: &ReducerContext, x: f32, y: f32) -> Result<(), String> {
    let player = ctx.db.players()
        .filter(|p| p.identity == ctx.sender)
        .first()
        .ok_or("Player not found")?;

    ctx.db.players().update(Player {
        x,
        y,
        last_active: Timestamp::now(),
        ..player
    })?;

    // Log event
    ctx.db.game_events().insert(GameEvent {
        id: 0,
        event_type: "move".to_string(),
        player: ctx.sender,
        data: format!("{},{}", x, y),
        timestamp: Timestamp::now(),
    })?;

    Ok(())
}

#[reducer]
pub fn attack_player(ctx: &ReducerContext, target: Identity, damage: u32) -> Result<(), String> {
    let target_player = ctx.db.players()
        .filter(|p| p.identity == target)
        .first()
        .ok_or("Target not found")?;

    let new_health = target_player.health.saturating_sub(damage);

    ctx.db.players().update(Player {
        health: new_health,
        ..target_player
    })?;

    Ok(())
}
```

### MCP Usage

```typescript
// 1. Connect to game server
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "space-shooter"
})

// 2. Spawn player
spacetimedb_call_reducer({
  reducer_name: "spawn_player",
  args: '["CaptainAce"]'
})

// 3. Subscribe to all players (for rendering)
spacetimedb_subscribe_table({
  table_name: "players"
})

// 4. Move player
spacetimedb_call_reducer({
  reducer_name: "move_player",
  args: '[150.5, 200.3]'
})

// 5. Attack another player
spacetimedb_call_reducer({
  reducer_name: "attack_player",
  args: '["target-identity-here", 25]'
})

// 6. Get current leaderboard
spacetimedb_execute_sql({
  query: "SELECT name, score FROM players ORDER BY score DESC LIMIT 10"
})

// 7. Get recent game events
spacetimedb_query_table({
  table_name: "game_events",
  limit: 50
})
```

---

## Chat Application Example

### SpacetimeDB Module (Rust)

```rust
// chat-server/src/lib.rs
use spacetimedb::{table, reducer, Identity, ReducerContext, SpacetimeType, Timestamp};

#[derive(SpacetimeType)]
#[table(name = users)]
pub struct User {
    #[primarykey]
    pub identity: Identity,
    pub name: String,
    pub online: bool,
    pub last_seen: Timestamp,
}

#[derive(SpacetimeType)]
#[table(name = messages)]
pub struct Message {
    #[autoinc]
    #[primarykey]
    pub id: u64,
    pub sender: Identity,
    pub channel: String,
    pub text: String,
    pub timestamp: Timestamp,
}

#[derive(SpacetimeType)]
#[table(name = channels)]
pub struct Channel {
    #[primarykey]
    pub name: String,
    pub description: String,
    pub created_by: Identity,
    pub created_at: Timestamp,
}

#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    if name.len() < 3 || name.len() > 20 {
        return Err("Name must be 3-20 characters".to_string());
    }

    let existing = ctx.db.users()
        .filter(|u| u.identity == ctx.sender)
        .first();

    if let Some(user) = existing {
        ctx.db.users().update(User {
            name,
            last_seen: Timestamp::now(),
            ..user
        })?;
    } else {
        ctx.db.users().insert(User {
            identity: ctx.sender,
            name,
            online: true,
            last_seen: Timestamp::now(),
        })?;
    }

    Ok(())
}

#[reducer]
pub fn send_message(ctx: &ReducerContext, text: String, channel: String) -> Result<(), String> {
    if text.is_empty() || text.len() > 500 {
        return Err("Message must be 1-500 characters".to_string());
    }

    ctx.db.messages().insert(Message {
        id: 0,
        sender: ctx.sender,
        channel,
        text,
        timestamp: Timestamp::now(),
    })?;

    Ok(())
}

#[reducer]
pub fn create_channel(ctx: &ReducerContext, name: String, description: String) -> Result<(), String> {
    ctx.db.channels().insert(Channel {
        name,
        description,
        created_by: ctx.sender,
        created_at: Timestamp::now(),
    })?;

    Ok(())
}
```

### MCP Usage

```typescript
// 1. Connect to chat server
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "quickstart-chat"
})

// 2. Set username
spacetimedb_call_reducer({
  reducer_name: "set_name",
  args: '["Alice"]'
})

// 3. Get list of channels
spacetimedb_query_table({
  table_name: "channels"
})

// 4. Subscribe to messages in general channel
spacetimedb_subscribe_table({
  table_name: "messages",
  filter: '{"channel": "general"}'
})

// 5. Subscribe to online users
spacetimedb_subscribe_table({
  table_name: "users",
  filter: '{"online": true}'
})

// 6. Send a message
spacetimedb_call_reducer({
  reducer_name: "send_message",
  args: '["Hello everyone!", "general"]'
})

// 7. Create a new channel
spacetimedb_call_reducer({
  reducer_name: "create_channel",
  args: '["random", "Random discussion"]'
})

// 8. Get message history
spacetimedb_query_table({
  table_name: "messages",
  filter: '{"channel": "general"}',
  limit: 100
})

// 9. Get user statistics
spacetimedb_execute_sql({
  query: "SELECT COUNT(*) as user_count, SUM(CASE WHEN online THEN 1 ELSE 0 END) as online_count FROM users"
})
```

---

## Real-time Leaderboard

### SpacetimeDB Module (Rust)

```rust
use spacetimedb::{table, reducer, Identity, ReducerContext, SpacetimeType, Timestamp};

#[derive(SpacetimeType)]
#[table(name = scores)]
pub struct Score {
    #[primarykey]
    pub player_id: Identity,
    pub player_name: String,
    pub score: u64,
    pub level: u32,
    pub achievements: u32,
    pub last_updated: Timestamp,
}

#[reducer]
pub fn update_score(ctx: &ReducerContext, name: String, points: u64, level: u32) -> Result<(), String> {
    let existing = ctx.db.scores()
        .filter(|s| s.player_id == ctx.sender)
        .first();

    if let Some(score) = existing {
        ctx.db.scores().update(Score {
            score: score.score + points,
            level: level.max(score.level),
            last_updated: Timestamp::now(),
            ..score
        })?;
    } else {
        ctx.db.scores().insert(Score {
            player_id: ctx.sender,
            player_name: name,
            score: points,
            level,
            achievements: 0,
            last_updated: Timestamp::now(),
        })?;
    }

    Ok(())
}
```

### MCP Usage

```typescript
// Connect
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "leaderboard"
})

// Get top 10 players
spacetimedb_execute_sql({
  query: "SELECT player_name, score, level FROM scores ORDER BY score DESC LIMIT 10"
})

// Get player ranking
spacetimedb_execute_sql({
  query: `
    SELECT
      player_name,
      score,
      (SELECT COUNT(*) FROM scores s2 WHERE s2.score > s1.score) + 1 as rank
    FROM scores s1
    WHERE player_id = 'my-identity'
  `
})

// Subscribe to leaderboard updates
spacetimedb_subscribe_table({
  table_name: "scores"
})

// Update player score
spacetimedb_call_reducer({
  reducer_name: "update_score",
  args: '["PlayerOne", 1000, 5]'
})
```

---

## Collaborative Document Editor

### SpacetimeDB Module (Rust)

```rust
use spacetimedb::{table, reducer, Identity, ReducerContext, SpacetimeType, Timestamp};

#[derive(SpacetimeType)]
#[table(name = documents)]
pub struct Document {
    #[primarykey]
    pub id: String,
    pub title: String,
    pub content: String,
    pub owner: Identity,
    pub created_at: Timestamp,
    pub modified_at: Timestamp,
}

#[derive(SpacetimeType)]
#[table(name = edits)]
pub struct Edit {
    #[autoinc]
    #[primarykey]
    pub id: u64,
    pub doc_id: String,
    pub user: Identity,
    pub operation: String,
    pub position: u32,
    pub text: String,
    pub timestamp: Timestamp,
}

#[reducer]
pub fn create_document(ctx: &ReducerContext, id: String, title: String) -> Result<(), String> {
    ctx.db.documents().insert(Document {
        id,
        title,
        content: String::new(),
        owner: ctx.sender,
        created_at: Timestamp::now(),
        modified_at: Timestamp::now(),
    })?;
    Ok(())
}

#[reducer]
pub fn insert_text(ctx: &ReducerContext, doc_id: String, position: u32, text: String) -> Result<(), String> {
    let doc = ctx.db.documents()
        .filter(|d| d.id == doc_id)
        .first()
        .ok_or("Document not found")?;

    let mut content = doc.content.clone();
    content.insert_str(position as usize, &text);

    ctx.db.documents().update(Document {
        content,
        modified_at: Timestamp::now(),
        ..doc
    })?;

    ctx.db.edits().insert(Edit {
        id: 0,
        doc_id,
        user: ctx.sender,
        operation: "insert".to_string(),
        position,
        text,
        timestamp: Timestamp::now(),
    })?;

    Ok(())
}
```

### MCP Usage

```typescript
// Connect
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "collab-editor"
})

// Create new document
spacetimedb_call_reducer({
  reducer_name: "create_document",
  args: '["doc-123", "My Document"]'
})

// Subscribe to document changes
spacetimedb_subscribe_table({
  table_name: "documents",
  filter: '{"id": "doc-123"}'
})

// Subscribe to edit history
spacetimedb_subscribe_table({
  table_name: "edits",
  filter: '{"doc_id": "doc-123"}'
})

// Insert text
spacetimedb_call_reducer({
  reducer_name: "insert_text",
  args: '["doc-123", 0, "Hello, world!"]'
})

// Get document
spacetimedb_query_table({
  table_name: "documents",
  filter: '{"id": "doc-123"}'
})
```

---

## IoT Device Monitoring

### SpacetimeDB Module (Rust)

```rust
use spacetimedb::{table, reducer, Identity, ReducerContext, SpacetimeType, Timestamp};

#[derive(SpacetimeType)]
#[table(name = devices)]
pub struct Device {
    #[primarykey]
    pub device_id: String,
    pub name: String,
    pub device_type: String,
    pub location: String,
    pub online: bool,
    pub last_seen: Timestamp,
}

#[derive(SpacetimeType)]
#[table(name = metrics)]
pub struct Metric {
    #[autoinc]
    #[primarykey]
    pub id: u64,
    pub device_id: String,
    pub metric_type: String,
    pub value: f64,
    pub unit: String,
    pub timestamp: Timestamp,
}

#[reducer]
pub fn report_metric(
    ctx: &ReducerContext,
    device_id: String,
    metric_type: String,
    value: f64,
    unit: String
) -> Result<(), String> {
    ctx.db.metrics().insert(Metric {
        id: 0,
        device_id,
        metric_type,
        value,
        unit,
        timestamp: Timestamp::now(),
    })?;
    Ok(())
}
```

### MCP Usage

```typescript
// Connect
spacetimedb_connect({
  uri: "wss://iot.example.com",
  module_name: "iot-monitor",
  auth_token: "iot-token"
})

// Get all devices
spacetimedb_query_table({
  table_name: "devices"
})

// Subscribe to online devices
spacetimedb_subscribe_table({
  table_name: "devices",
  filter: '{"online": true}'
})

// Subscribe to temperature metrics
spacetimedb_subscribe_table({
  table_name: "metrics",
  filter: '{"metric_type": "temperature"}'
})

// Report device metric
spacetimedb_call_reducer({
  reducer_name: "report_metric",
  args: '["device-001", "temperature", 22.5, "celsius"]'
})

// Get recent metrics for a device
spacetimedb_execute_sql({
  query: `
    SELECT metric_type, AVG(value) as avg_value, MAX(value) as max_value, MIN(value) as min_value
    FROM metrics
    WHERE device_id = 'device-001' AND timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY metric_type
  `
})

// Get device health summary
spacetimedb_execute_sql({
  query: `
    SELECT
      COUNT(*) as total_devices,
      SUM(CASE WHEN online THEN 1 ELSE 0 END) as online_devices,
      SUM(CASE WHEN NOT online THEN 1 ELSE 0 END) as offline_devices
    FROM devices
  `
})
```

---

## Admin Dashboard

```typescript
// Connect with admin credentials
spacetimedb_connect({
  uri: "wss://prod.example.com",
  module_name: "production-app",
  auth_token: "admin-token"
})

// Get database overview
const info = spacetimedb_get_connection_info({})

// List all tables
const tables = spacetimedb_list_tables({ include_schema: true })

// Get database statistics
spacetimedb_execute_sql({
  query: `
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM users WHERE online = true) as active_users,
      (SELECT COUNT(*) FROM messages) as total_messages,
      (SELECT COUNT(*) FROM messages WHERE timestamp > NOW() - INTERVAL '24 hours') as messages_today
  `
})

// Get table row counts
for (const table of tables) {
  spacetimedb_execute_sql({
    query: `SELECT COUNT(*) as count FROM ${table.name}`
  })
}

// Get recent activity
spacetimedb_execute_sql({
  query: `
    SELECT
      DATE_TRUNC('hour', timestamp) as hour,
      COUNT(*) as event_count
    FROM game_events
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY hour
    ORDER BY hour DESC
  `
})

// Monitor specific user
spacetimedb_query_table({
  table_name: "users",
  filter: '{"name": "SuspiciousUser"}'
})

// Get error logs
spacetimedb_query_table({
  table_name: "error_logs",
  limit: 50
})
```

---

## Testing Workflow

```typescript
// 1. Start local SpacetimeDB
// $ spacetime start

// 2. Connect to local instance
spacetimedb_connect({
  uri: "ws://localhost:3000",
  module_name: "test-module"
})

// 3. Test connection
spacetimedb_get_connection_info({})

// 4. Explore schema
spacetimedb_get_schema({})
spacetimedb_list_reducers({ include_signatures: true })

// 5. Test data operations
spacetimedb_call_reducer({
  reducer_name: "init",
  args: '[]'
})

// 6. Verify results
spacetimedb_list_tables({ include_schema: false })
spacetimedb_query_table({ table_name: "users" })

// 7. Clean up
spacetimedb_disconnect({})
```

---

## Monitoring Best Practices

```typescript
// Health check function
async function healthCheck() {
  const info = await spacetimedb_get_connection_info({});

  if (!info.connected) {
    console.log("Reconnecting...");
    await spacetimedb_connect({
      uri: "ws://localhost:3000",
      module_name: "my-app"
    });
  }

  return info;
}

// Periodic health check
setInterval(healthCheck, 30000); // Every 30 seconds

// Monitor subscription count
async function checkSubscriptions() {
  const info = await spacetimedb_get_connection_info({});
  console.log(`Active subscriptions: ${info.activeSubscriptions.length}`);

  if (info.activeSubscriptions.length > 10) {
    console.warn("Too many subscriptions, consider cleanup");
  }
}
```

---

For more examples and patterns, see [USAGE.md](USAGE.md) and [README.md](README.md).
