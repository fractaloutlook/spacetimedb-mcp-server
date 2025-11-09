# SpacetimeDB Module Bindings Summary

This is a condensed reference for the auto-generated TypeScript bindings that connect your client application to the SpacetimeDB server.

## Core Types

### Database Tables
- `Admin`: Stores admin user identities
- `CurrentStatus`: Current status message with timestamp
- `Message`: Chat messages with sender, timestamp, and text
- `UpdateLog`: Status update log entries
- `User`: User information with identity, name, and online status
- `Poll`, `PollOption`, `PollVote`: Poll system tables

### Reducers (Server Functions)
- `addAdmin`: Add current user as admin
- `addUpdate`: Add a new status update entry
- `sendMessage`: Send a chat message
- `setName`: Set user display name
- `updateStatus`: Update the current status message
- `createPoll`, `voteOnPoll`: Poll management functions

## Key Classes

### DbConnection
```typescript
// Main connection class with builder pattern
DbConnection.builder()
  .withUri('wss://api.fractaloutlook.com')
  .withModuleName('status-module')
  .withToken(localStorage.getItem('auth_token'))
  .onConnect((conn, identity, token) => {
    // Store connection and handle initial data
  })
  .build();
```

### Table Access
```typescript
// Access table data
connection.db.message.iter()
connection.db.admin.count()
connection.db.currentStatus.id.find(0)

// Subscribe to table events
connection.db.message.onInsert((ctx, message) => {
  // Handle new message
})
```

### Reducer Calls
```typescript
// Call server functions
connection.reducers.sendMessage("Hello world")
connection.reducers.updateStatus("Working on new features")
connection.reducers.addUpdate("Added chat functionality")
```

### Subscription
```typescript
// Subscribe to database tables
connection.subscriptionBuilder()
  .onApplied((ctx) => {
    console.log("Subscription applied!");
  })
  .subscribe([
    'SELECT * FROM admin',
    'SELECT * FROM message',
    'SELECT * FROM current_status'
  ]);
```

## Type Definitions

All tables have TypeScript interfaces that match their server-side structure:

```typescript
// Example type definitions
type Message = {
  sender: Identity,
  sent: bigint,
  text: string,
};

type CurrentStatus = {
  id: number,
  message: string,
  lastUpdated: bigint,
};

type User = {
  identity: Identity,
  name: string | undefined,
  online: boolean,
};
```

## Notes for Development

- These bindings are auto-generated using the `spacetime generate` command
- They should not be manually edited as changes will be lost on regeneration
- When the server module changes, regenerate bindings with:
  ```
  spacetime generate --lang typescript --out-dir ./src/module_bindings
  ```
- After generation, you may need to delete `LoggedOutPlayer.ts` due to a bug in code generation
