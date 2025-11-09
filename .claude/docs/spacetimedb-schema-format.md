<!-- Last updated: 2025-01-08 21:25 PST -->

# SpacetimeDB Schema Format (RawModuleDef)

Schema returned from `GET /v1/database/:module/schema`

## Structure
```typescript
{
  typespace: number,
  tables: TableSchema[],
  reducers: ReducerSchema[]
}
```

## TableSchema
```typescript
{
  name: string,
  columns: ColumnSchema[],
  indexes: IndexSchema[],
  constraints: ConstraintSchema[],
  sequences: SequenceSchema[],
  type: string,        // e.g. "table"
  access: string       // "public" or "private"
}
```

## ColumnSchema
```typescript
{
  name: string,
  ty: AlgebraicType
}
```

## AlgebraicType Examples
- Primitives: `{ type: "U64" }`, `{ type: "String" }`, `{ type: "Bool" }`
- Timestamp: `{ type: "Timestamp" }`
- Identity: `{ type: "Identity" }`
- Product (struct): `{ type: "Product", elements: [...] }`
- Sum (enum): `{ type: "Sum", variants: [...] }`
- Array: `{ type: "Array", element_ty: {...} }`
- Option: `{ type: "Option", some_ty: {...} }`

## ReducerSchema
```typescript
{
  name: string,
  params: { elements: ParamSchema[] },
  lifecycle: string | null  // "init", "client_connected", etc.
}
```

## ParamSchema
```typescript
{
  name: string,
  ty: AlgebraicType
}
```
