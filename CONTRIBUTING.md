# Contributing to SpacetimeDB MCP Server

Thank you for considering contributing to the SpacetimeDB MCP Server! This document provides guidelines and information for contributors.

## Ways to Contribute

- **Bug Reports**: Report issues you encounter
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve or add documentation
- **Examples**: Share use cases and examples
- **Testing**: Help test new features and report issues

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- SpacetimeDB CLI installed
- Git for version control
- TypeScript knowledge

### Setup Steps

1. **Clone the repository**

   **Bash:**
   ```bash
   git clone https://github.com/yourusername/spacetimedb-mcp-server.git
   cd spacetimedb-mcp-server
   ```

   **Windows CMD:**
   ```cmd
   git clone https://github.com/yourusername/spacetimedb-mcp-server.git
   cd spacetimedb-mcp-server
   ```

2. **Install dependencies**

   **Bash/CMD:**
   ```bash
   npm install
   ```

3. **Build the project**

   **Bash/CMD:**
   ```bash
   npm run build
   ```

4. **Run in development mode**

   **Bash/CMD:**
   ```bash
   npm run dev
   ```

## Project Structure

```
spacetimedb-mcp-server/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   └── spacetimedb-connection.ts   # Connection manager
├── dist/                           # Compiled JavaScript output
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Main documentation
├── USAGE.md                        # Usage guide
├── EXAMPLES.md                     # Code examples
└── CONTRIBUTING.md                 # This file
```

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer `const` over `let` when possible
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use async/await over promises when possible

### Example

```typescript
/**
 * Queries a table with optional filtering
 *
 * @param tableName - Name of the table to query
 * @param filter - Optional filter object
 * @param limit - Maximum rows to return
 * @returns Query results with rows and metadata
 */
async queryTable(
  tableName: string,
  filter?: any,
  limit: number = 100
): Promise<QueryResult> {
  this.ensureConnected();
  // Implementation...
}
```

## Testing

### Manual Testing

1. Start a local SpacetimeDB instance:

   **Bash/CMD:**
   ```bash
   spacetime start
   ```

2. Deploy a test module:

   **Bash/CMD:**
   ```bash
   spacetime publish test-module --project-path ./test-module
   ```

3. Test the MCP server:

   **Bash/CMD:**
   ```bash
   npm run build
   node dist/index.js
   ```

4. Test with Claude Desktop or another MCP client

### Test Checklist

- [ ] Connection to local SpacetimeDB
- [ ] Connection to cloud SpacetimeDB
- [ ] Table listing and querying
- [ ] Reducer invocation
- [ ] Schema introspection
- [ ] Subscription management
- [ ] Error handling
- [ ] Authentication with tokens

## Areas for Improvement

### High Priority

1. **WebSocket Connection Pooling**
   - Implement connection reuse
   - Handle reconnection logic
   - Graceful degradation

2. **Better Error Handling**
   - More descriptive error messages
   - Retry logic for transient failures
   - Connection health monitoring

3. **Automatic Binding Generation**
   - Generate TypeScript bindings from modules
   - Cache generated bindings
   - Type-safe SDK integration

4. **Streaming Results**
   - Support for large result sets
   - Pagination helpers
   - Lazy loading

### Medium Priority

1. **Transaction Support**
   - Multi-reducer transactions
   - Rollback capabilities
   - Optimistic updates

2. **Advanced Subscription Filtering**
   - Complex filter expressions
   - Dynamic filter updates
   - Subscription aggregation

3. **Performance Optimization**
   - Response caching
   - Query optimization
   - Batch operations

4. **Enhanced CLI Integration**
   - Better output parsing
   - Progress indicators
   - Interactive mode

### Low Priority

1. **Metrics and Monitoring**
   - Connection metrics
   - Query performance tracking
   - Usage statistics

2. **Development Tools**
   - Debug mode
   - Query builder
   - Schema migration helpers

## Adding New Features

### 1. Adding a New Tool

1. Update tool list in `src/index.ts`:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools
      {
        name: "spacetimedb_your_new_tool",
        description: "Description of what your tool does",
        inputSchema: {
          type: "object",
          properties: {
            param1: {
              type: "string",
              description: "Description of param1"
            }
          },
          required: ["param1"]
        }
      }
    ]
  };
});
```

2. Add tool handler:

```typescript
case "spacetimedb_your_new_tool": {
  const { param1 } = args as { param1: string };
  const result = await connectionManager.yourNewMethod(param1);

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

3. Implement method in `src/spacetimedb-connection.ts`:

```typescript
async yourNewMethod(param1: string): Promise<any> {
  this.ensureConnected();
  // Implementation...
}
```

4. Add tests and documentation

### 2. Adding a New Resource

1. Update resource handler in `src/index.ts`:

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // ... existing resources
  resources.push({
    uri: "spacetimedb://your-resource",
    name: "Your Resource",
    description: "Description",
    mimeType: "application/json"
  });
});
```

2. Add read handler:

```typescript
if (uri === "spacetimedb://your-resource") {
  const data = await connectionManager.getYourResourceData();

  return {
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}
```

## Pull Request Process

1. **Create a branch**

   **Bash/CMD:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow the code style guidelines
   - Add tests if applicable

3. **Test your changes**
   - Build the project: `npm run build`
   - Test manually with SpacetimeDB
   - Verify no regressions

4. **Commit your changes**

   **Bash/CMD:**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

5. **Push and create PR**

   **Bash/CMD:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **PR Description**
   - Clearly describe the changes
   - Reference any related issues
   - Include testing steps
   - Add screenshots if applicable

## Code Review

All submissions require review. We use GitHub pull requests for this purpose. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation completeness
- Breaking changes
- Performance implications

## Documentation

When adding new features:

1. Update README.md if it changes user-facing behavior
2. Add examples to EXAMPLES.md
3. Update USAGE.md with detailed usage instructions
4. Add JSDoc comments to code
5. Update CHANGELOG.md (if maintained)

## Bug Reports

When reporting bugs, include:

- SpacetimeDB MCP Server version
- Node.js version
- SpacetimeDB version
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages or logs

Example:

```markdown
**Environment:**
- MCP Server: v1.0.0
- Node.js: v20.11.0
- SpacetimeDB: v0.10.0
- OS: Windows 11

**Steps to Reproduce:**
1. Connect to ws://localhost:3000
2. Call spacetimedb_query_table with table "users"
3. Error occurs

**Expected:** Should return user data

**Actual:** Error: "Table not found"

**Logs:**
```
[error log here]
```
```

## Feature Requests

When requesting features, include:

- Use case description
- Proposed solution
- Alternative solutions considered
- Additional context

## Community

- Join SpacetimeDB Discord: [discord.gg/spacetimedb](https://discord.gg/spacetimedb)
- Follow SpacetimeDB development: [github.com/clockworklabs/SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB)
- MCP documentation: [modelcontextprotocol.io](https://modelcontextprotocol.io)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:
- Open an issue for questions
- Ask in SpacetimeDB Discord
- Reach out to maintainers

## Acknowledgments

Thank you to:
- SpacetimeDB team for the amazing database
- Anthropic for the MCP specification
- All contributors and users

---

**Happy Contributing!**
