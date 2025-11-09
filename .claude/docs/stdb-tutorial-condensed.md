# SpacetimeDB Core Concepts and Patterns
*Condensed from Unity Tutorials*

## Module Development (Server-Side)

### Key SpacetimeDB Tables

```rust
// Config table example - singleton pattern
#[spacetimedb::table(name = config, public)]
pub struct Config {
    #[primary_key]
    pub id: u32,
    pub world_size: u64,
}

// Entity table with auto_inc primary key
#[spacetimedb::table(name = entity, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[auto_inc]
    #[primary_key]
    pub entity_id: u32,
    pub position: DbVector2,
    pub mass: u32,
}

// Table with Identity field for user identification
#[spacetimedb::table(name = player, public)]
#[derive(Debug, Clone)]
pub struct Player {
    #[primary_key]
    identity: Identity,
    #[unique]
    #[auto_inc]
    player_id: u32,
    name: String,
}

// Multi-table pattern for online/offline state
#[spacetimedb::table(name = player, public)]
#[spacetimedb::table(name = logged_out_player)]
#[derive(Debug, Clone)]
pub struct Player {
    #[primary_key]
    identity: Identity,
    #[unique]
    #[auto_inc]
    player_id: u32,
    name: String,
}
```

### Custom Types

```rust
// Custom type for use in tables
#[derive(SpacetimeType, Clone, Debug)]
pub struct DbVector2 {
    pub x: f32,
    pub y: f32,
}
```

### Special Reducers

```rust
// Init reducer - called when module is first published
#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    // Initialize database with starting values
    ctx.db.config().try_insert(Config {
        id: 0,
        world_size: 1000,
    })?;
    
    // Schedule recurring tasks
    ctx.db.spawn_food_timer().try_insert(SpawnFoodTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(Duration::from_millis(500).as_micros() as u64),
    })?;
    
    Ok(())
}

// Client connection handler
#[spacetimedb::reducer(client_connected)]
pub fn connect(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(player) = ctx.db.logged_out_player().identity().find(&ctx.sender) {
        // Move player from logged_out to player table
        ctx.db.player().insert(player.clone());
        ctx.db.logged_out_player().identity().delete(&player.identity);
    } else {
        // Create new player
        ctx.db.player().try_insert(Player {
            identity: ctx.sender,
            player_id: 0,
            name: String::new(),
        })?;
    }
    Ok(())
}

// Client disconnection handler
#[spacetimedb::reducer(client_disconnected)]
pub fn disconnect(ctx: &ReducerContext) -> Result<(), String> {
    // Move player from player to logged_out_player table
    let player = ctx.db.player().identity().find(&ctx.sender)
        .ok_or("Player not found")?;
    ctx.db.logged_out_player().insert(player.clone());
    ctx.db.player().identity().delete(&ctx.sender);
    
    Ok(())
}
```

### Scheduled Reducers

```rust
// Scheduled table for recurring tasks
#[spacetimedb::table(name = spawn_food_timer, scheduled(spawn_food))]
pub struct SpawnFoodTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

// Reducer that gets called on schedule
#[spacetimedb::reducer]
pub fn spawn_food(ctx: &ReducerContext, _timer: SpawnFoodTimer) -> Result<(), String> {
    // Logic that runs on schedule
    // ...
    Ok(())
}

// How to schedule a task
ctx.db.spawn_food_timer().try_insert(SpawnFoodTimer {
    scheduled_id: 0,
    scheduled_at: ScheduleAt::Interval(Duration::from_millis(500).as_micros() as u64),
})?;

// One-time scheduled event
ctx.db.some_timer().try_insert(SomeTimer {
    scheduled_id: 0, 
    scheduled_at: ScheduleAt::Time(future_timestamp.as_micros() as u64),
})?;
```

### Standard Reducers

```rust
#[spacetimedb::reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    let name = validate_name(name)?;
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { name: Some(name), ..user });
        Ok(())
    } else {
        Err("Cannot set name for unknown user".to_string())
    }
}

#[spacetimedb::reducer]
pub fn update_player_input(ctx: &ReducerContext, direction: DbVector2) -> Result<(), String> {
    let player = ctx.db.player().identity().find(&ctx.sender)
        .ok_or("Player not found")?;
    for mut circle in ctx.db.circle().player_id().filter(&player.player_id) {
        circle.direction = direction.normalized();
        circle.speed = direction.magnitude().clamp(0.0, 1.0);
        ctx.db.circle().entity_id().update(circle);
    }
    Ok(())
}
```

### Table Operations

```rust
// Query operations
let world_size = ctx.db.config().id().find(0).ok_or("Config not found")?.world_size;
let player = ctx.db.player().identity().find(&ctx.sender).ok_or("Player not found")?;
let circles = ctx.db.circle().player_id().filter(&player_id);

// Insert operations
ctx.db.entity().try_insert(Entity { /* ... */ })?;
ctx.db.entity().insert(Entity { /* ... */ });  // Panics on error

// Update operations
ctx.db.user().identity().update(User { name: Some(name), ..user });

// Delete operations
ctx.db.player().identity().delete(&ctx.sender);

// Iteration
for circle in ctx.db.circle().iter() {
    // Process each circle
}
```

## Client-Side Development

### Connection Setup

```typescript
// Initialize connection
const conn = await DBConnection.builder()
  .withUri('ws://localhost:3000')
  .withModuleName('blackholio')
  .withToken(savedToken || null)
  .onConnect((connectedConn, identity, token) => {
    console.log('Connected with identity:', identity);
    localStorage.setItem('auth_token', token);
    
    // Set up subscription
    connectedConn.subscriptionBuilder()
      .onApplied((ctx) => {
        console.log('Subscription applied!');
        // Initial data is now loaded
      })
      .subscribe([
        'SELECT * FROM player',
        'SELECT * FROM entity',
        'SELECT * FROM config'
      ]);
  })
  .onConnectError((_, error) => {
    console.error('Connection error:', error);
  })
  .onDisconnect(() => {
    console.log('Disconnected');
  })
  .build();
```

### Client Data Access and Events

```typescript
// Access data from tables
const player = connection.db.player.identity.find(identity);
const entities = Array.from(connection.db.entity.iter());
const configValue = connection.db.config.id.find(0).value;

// Register for table events
connection.db.message.onInsert((ctx, message) => {
  console.log('New message:', message.text);
});

connection.db.player.onUpdate((ctx, oldPlayer, newPlayer) => {
  console.log(`Player ${oldPlayer.name} updated to ${newPlayer.name}`);
});

// Call reducers
connection.reducers.setName("NewPlayerName");
connection.reducers.sendMessage("Hello, world!");
```

### Authentication Patterns

```typescript
// Save token for persistent identity
localStorage.setItem('auth_token', token);

// Load token on startup
const savedToken = localStorage.getItem('auth_token');
if (isValidToken(savedToken)) {
  // Use saved token for authentication
  connection.withToken(savedToken);
} else {
  // Connect anonymously (new identity will be created)
  connection.withToken(null);
}
```

## Key Concepts and Best Practices

1. **Table Structure**:
   - Use `#[primary_key]` for unique identification
   - Use `#[auto_inc]` to let the system assign IDs
   - Use `#[unique]` for fields that must be unique
   - Public tables can be read by clients
   - Use multiple table macros for the same Rust struct to create related tables

2. **Reducers**:
   - Handle authentication through `ctx.sender`
   - Return `Result<(), String>` to handle errors
   - Special reducers: `init`, `client_connected`, `client_disconnected`
   - Scheduled reducers for recurring tasks

3. **Client Connections**:
   - Save auth tokens for persistent identity
   - Subscribe to relevant tables only
   - Handle connection events
   - Register callbacks for table events

4. **Data Flow**:
   - Server owns all data mutations
   - Clients call reducers to request changes
   - Server updates tables
   - Clients receive updates via subscriptions
   - Callbacks fired when data changes

5. **Performance Considerations**:
   - Subscribe only to needed tables
   - Use specific queries rather than "SELECT * FROM *" 
   - Consider indexing for frequently queried fields
   - Use appropriate data structures for your use case
