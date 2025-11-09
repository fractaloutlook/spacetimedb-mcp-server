The SpacetimeDB Typescript client SDK
The SpacetimeDB client SDK for TypeScript contains all the tools you need to build clients for SpacetimeDB modules using Typescript, either in the browser or with NodeJS.

Name	Description
Project setup	Configure your TypeScript project to use the SpacetimeDB TypeScript client SDK.
Generate module bindings	Use the SpacetimeDB CLI to generate module-specific types and interfaces.
DbConnection type	A connection to a remote database.
DbContext interface	Methods for interacting with the remote database. Implemented by DbConnection and various event context types.
EventContext type	DbContext available in row callbacks.
ReducerEventContext type	DbContext available in reducer callbacks.
SubscriptionEventContext type	DbContext available in subscription-related callbacks.
ErrorContext type	DbContext available in error-related callbacks.
Access the client cache	Make local queries against subscribed rows, and register row callbacks to run when subscribed rows change.
Observe and invoke reducers	Send requests to the database to run reducers, and register callbacks to run when notified of reducers.
Identify a client	Types for identifying users and client connections.
Project setup
First, create a new client project, and add the following to your tsconfig.json file:

{
  "compilerOptions": {
    //You can use any target higher than this one
    //https://www.typescriptlang.org/tsconfig#target
    "target": "es2015"
  }
}
Then add the SpacetimeDB SDK to your dependencies:

cd client
npm install spacetimedb
WARNING! The @clockworklabs/spacetimedb-sdk package has been deprecated in favor of the spacetimedb package as of SpacetimeDB version 1.4.0. If you are using the old SDK package, you will need to switch to spacetimedb. You will also need a SpacetimeDB CLI version of 1.4.0+ to generate bindings for the new spacetimedb package.

You should have this folder layout starting from the root of your project:

quickstart-chat
├── client
│   ├── node_modules
│   ├── public
│   └── src
└── server
    └── src
Tip for utilities/scripts
If want to create a quick script to test your module bindings from the command line, you can use https://www.npmjs.com/package/tsx to execute TypeScript files.

Then you create a script.ts file and add the imports, code and execute with:

npx tsx src/script.ts
Generate module bindings
Each SpacetimeDB client depends on some bindings specific to your module. Create a module_bindings directory in your project's src directory and generate the Typescript interface files using the Spacetime CLI. From your project directory, run:

mkdir -p client/src/module_bindings
spacetime generate --lang typescript \
    --out-dir client/src/module_bindings \
    --project-path PATH-TO-MODULE-DIRECTORY
Import the module_bindings in your client's main file:

import * as moduleBindings from './module_bindings/index';
You may also need to import some definitions from the SDK library:

import { Identity, ConnectionId, Event, ReducerEvent } from 'spacetimedb';
Type DbConnection
DbConnection;
A connection to a remote database is represented by the DbConnection type. This type is generated per-module, and contains information about the types, tables and reducers defined by your module.

Name	Description
Connect to a database	Construct a DbConnection.
Access tables and reducers	Access subscribed rows in the client cache, request reducer invocations, and register callbacks.
Connect to a database
class DbConnection {
  public static builder(): DbConnectionBuilder;
}
Construct a DbConnection by calling DbConnection.builder() and chaining configuration methods, then calling .build(). You must at least specify withUri, to supply the URI of the SpacetimeDB to which you published your module, and withModuleName, to supply the human-readable SpacetimeDB domain name or the raw Identity which identifies the database.

Name	Description
withUri method	Set the URI of the SpacetimeDB instance which hosts the remote database.
withModuleName method	Set the name or Identity of the remote database.
onConnect callback	Register a callback to run when the connection is successfully established.
onConnectError callback	Register a callback to run if the connection is rejected or the host is unreachable.
onDisconnect callback	Register a callback to run when the connection ends.
withToken method	Supply a token to authenticate with the remote database.
build method	Finalize configuration and connect.
Method withUri
class DbConnectionBuilder {
  public withUri(uri: string): DbConnectionBuilder;
}
Configure the URI of the SpacetimeDB instance or cluster which hosts the remote database.

Method withModuleName
class DbConnectionBuilder {
  public withModuleName(name_or_identity: string): DbConnectionBuilder;
}
Configure the SpacetimeDB domain name or hex string encoded Identity of the remote database which identifies it within the SpacetimeDB instance or cluster.

Callback onConnect
class DbConnectionBuilder {
  public onConnect(
    callback: (ctx: DbConnection, identity: Identity, token: string) => void
  ): DbConnectionBuilder;
}
Chain a call to .onConnect(callback) to your builder to register a callback to run when your new DbConnection successfully initiates its connection to the remote database. The callback accepts three arguments: a reference to the DbConnection, the Identity by which SpacetimeDB identifies this connection, and a private access token which can be saved and later passed to withToken to authenticate the same user in future connections.

Callback onConnectError
class DbConnectionBuilder {
  public onConnectError(
    callback: (ctx: ErrorContext, error: Error) => void
  ): DbConnectionBuilder;
}
Chain a call to .onConnectError(callback) to your builder to register a callback to run when your connection fails.

Callback onDisconnect
class DbConnectionBuilder {
  public onDisconnect(
    callback: (ctx: ErrorContext, error: Error | null) => void
  ): DbConnectionBuilder;
}
Chain a call to .onDisconnect(callback) to your builder to register a callback to run when your DbConnection disconnects from the remote database, either as a result of a call to disconnect or due to an error.

Method withToken
class DbConnectionBuilder {
  public withToken(token?: string): DbConnectionBuilder;
}
Chain a call to .withToken(token) to your builder to provide an OpenID Connect compliant JSON Web Token to authenticate with, or to explicitly select an anonymous connection. If this method is not called or null is passed, SpacetimeDB will generate a new Identity and sign a new private access token for the connection.

Method build
class DbConnectionBuilder {
  public build(): DbConnection;
}
After configuring the connection and registering callbacks, attempt to open the connection.

Access tables and reducers
Field db
class DbConnection {
  public db: RemoteTables;
}
The db field of the DbConnection provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class DbConnection {
  public reducers: RemoteReducers;
}
The reducers field of the DbConnection provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Interface DbContext
interface DbContext<
    DbView,
    Reducers,
>
DbConnection, EventContext, ReducerEventContext, SubscriptionEventContext and ErrorContext all implement DbContext. DbContext has fields and methods for inspecting and configuring your connection to the remote database.

The DbContext interface is implemented by connections and contexts to every module. This means that its DbView and Reducers are generic types.

Name	Description
db field	Access subscribed rows of tables and register row callbacks.
reducers field	Request reducer invocations and register reducer callbacks.
disconnect method	End the connection.
Subscribe to queries	Register SQL queries to receive updates about matching rows.
Read connection metadata	Access the connection's Identity and ConnectionId
Field db
interface DbContext {
  db: DbView;
}
The db field of a DbContext provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
interface DbContext {
  reducers: Reducers;
}
The reducers field of a DbContext provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Method disconnect
interface DbContext {
  disconnect(): void;
}
Gracefully close the DbConnection. Throws an error if the connection is already disconnected.

Subscribe to queries
Name	Description
SubscriptionBuilder type	Builder-pattern constructor to register subscribed queries.
SubscriptionHandle type	Manage an active subscripion.
Type SubscriptionBuilder
SubscriptionBuilder;
Name	Description
ctx.subscriptionBuilder() constructor	Begin configuring a new subscription.
onApplied callback	Register a callback to run when matching rows become available.
onError callback	Register a callback to run if the subscription fails.
subscribe method	Finish configuration and subscribe to one or more SQL queries.
subscribeToAllTables method	Convenience method to subscribe to the entire database.
Constructor ctx.subscriptionBuilder()
interface DbContext {
  subscriptionBuilder(): SubscriptionBuilder;
}
Subscribe to queries by calling ctx.subscription_builder() and chaining configuration methods, then calling .subscribe(queries).

Callback onApplied
class SubscriptionBuilder {
  public onApplied(
    callback: (ctx: SubscriptionEventContext) => void
  ): SubscriptionBuilder;
}
Register a callback to run when the subscription is applied and the matching rows are inserted into the client cache.

Callback onError
class SubscriptionBuilder {
  public onError(
    callback: (ctx: ErrorContext, error: Error) => void
  ): SubscriptionBuilder;
}
Register a callback to run if the subscription is rejected or unexpectedly terminated by the server. This is most frequently caused by passing an invalid query to subscribe.

Method subscribe
class SubscriptionBuilder {
  subscribe(queries: string | string[]): SubscriptionHandle;
}
Subscribe to a set of queries.

See the SpacetimeDB SQL Reference for information on the queries SpacetimeDB supports as subscriptions.

Method subscribeToAllTables
class SubscriptionBuilder {
  subscribeToAllTables(): void;
}
Subscribe to all rows from all public tables. This method is provided as a convenience for simple clients. The subscription initiated by subscribeToAllTables cannot be canceled after it is initiated. You should subscribe to specific queries if you need fine-grained control over the lifecycle of your subscriptions.

Type SubscriptionHandle
SubscriptionHandle;
A SubscriptionHandle represents a subscribed query or a group of subscribed queries.

The SubscriptionHandle does not contain or provide access to the subscribed rows. Subscribed rows of all subscriptions by a connection are contained within that connection's ctx.db. See Access the client cache.

Name	Description
isEnded method	Determine whether the subscription has ended.
isActive method	Determine whether the subscription is active and its matching rows are present in the client cache.
unsubscribe method	Discard a subscription.
unsubscribeThen method	Discard a subscription, and register a callback to run when its matching rows are removed from the client cache.
Method isEnded
class SubscriptionHandle {
  public isEnded(): bool;
}
Returns true if this subscription has been terminated due to an unsubscribe call or an error.

Method isActive
class SubscriptionHandle {
  public isActive(): bool;
}
Returns true if this subscription has been applied and has not yet been unsubscribed.

Method unsubscribe
class SubscriptionHandle {
  public unsubscribe(): void;
}
Terminate this subscription, causing matching rows to be removed from the client cache. Any rows removed from the client cache this way will have onDelete callbacks run for them.

Unsubscribing is an asynchronous operation. Matching rows are not removed from the client cache immediately. Use unsubscribeThen to run a callback once the unsubscribe operation is completed.

Throws an error if the subscription has already ended, either due to a previous call to unsubscribe or unsubscribeThen, or due to an error.

Method unsubscribeThen
class SubscriptionHandle {
  public unsubscribeThen(on_end: (ctx: SubscriptionEventContext) => void): void;
}
Terminate this subscription, and run the onEnd callback when the subscription is ended and its matching rows are removed from the client cache. Any rows removed from the client cache this way will have onDelete callbacks run for them.

Returns an error if the subscription has already ended, either due to a previous call to unsubscribe or unsubscribeThen, or due to an error.

Read connection metadata
Field isActive
interface DbContext {
  isActive: bool;
}
true if the connection has not yet disconnected. Note that a connection isActive when it is constructed, before its onConnect callback is invoked.

Type EventContext
EventContext;
An EventContext is a DbContext augmented with a field event: Event. EventContexts are passed as the first argument to row callbacks onInsert, onDelete and onUpdate.

Name	Description
event field	Enum describing the cause of the current row callback.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Event type	Possible events which can cause a row callback to be invoked.
Field event
class EventContext {
  public event: Event<Reducer>;
}
/* other fields */
The Event contained in the EventContext describes what happened to cause the current row callback to be invoked.

Field db
class EventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class EventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type Event
type Event<Reducer> =
  | { tag: 'Reducer'; value: ReducerEvent<Reducer> }
  | { tag: 'SubscribeApplied' }
  | { tag: 'UnsubscribeApplied' }
  | { tag: 'Error'; value: Error }
  | { tag: 'UnknownTransaction' };
Name	Description
Reducer variant	A reducer ran in the remote database.
SubscribeApplied variant	A new subscription was applied to the client cache.
UnsubscribeApplied variant	A previous subscription was removed from the client cache after a call to unsubscribe.
Error variant	A previous subscription was removed from the client cache due to an error.
UnknownTransaction variant	A transaction ran in the remote database, but was not attributed to a known reducer.
ReducerEvent type	Metadata about a reducer run. Contained in Event::Reducer and ReducerEventContext.
UpdateStatus type	Completion status of a reducer run.
Reducer type	Module-specific generated enum with a variant for each reducer defined by the module.
Variant Reducer
{
  tag: 'Reducer';
  value: ReducerEvent<Reducer>;
}
Event when we are notified that a reducer ran in the remote database. The ReducerEvent contains metadata about the reducer run, including its arguments and termination status(#type-updatestatus).

This event is passed to row callbacks resulting from modifications by the reducer.

Variant SubscribeApplied
{
  tag: 'SubscribeApplied';
}
Event when our subscription is applied and its rows are inserted into the client cache.

This event is passed to row onInsert callbacks resulting from the new subscription.

Variant UnsubscribeApplied
{
  tag: 'UnsubscribeApplied';
}
Event when our subscription is removed after a call to SubscriptionHandle.unsubscribe or SubscriptionHandle.unsubscribeThen and its matching rows are deleted from the client cache.

This event is passed to row onDelete callbacks resulting from the subscription ending.

Variant Error
{
  tag: 'Error';
  value: Error;
}
Event when a subscription ends unexpectedly due to an error.

This event is passed to row onDelete callbacks resulting from the subscription ending.

Variant UnknownTransaction
{
  tag: 'UnknownTransaction';
}
Event when we are notified of a transaction in the remote database which we cannot associate with a known reducer. This may be an ad-hoc SQL query or a reducer for which we do not have bindings.

This event is passed to row callbacks resulting from modifications by the transaction.

Type ReducerEvent
A ReducerEvent contains metadata about a reducer run.

type ReducerEvent<Reducer> = {
  /**
   * The time when the reducer started running.
   */
  timestamp: Timestamp;

  /**
   * Whether the reducer committed, was aborted due to insufficient energy, or failed with an error message.
   */
  status: UpdateStatus;

  /**
   * The identity of the caller.
   * TODO: Revise these to reflect the forthcoming Identity proposal.
   */
  callerIdentity: Identity;

  /**
   * The connection ID of the caller.
   *
   * May be `null`, e.g. for scheduled reducers.
   */
  callerConnectionId?: ConnectionId;

  /**
   * The amount of energy consumed by the reducer run, in eV.
   * (Not literal eV, but our SpacetimeDB energy unit eV.)
   * May be present or undefined at the implementor's discretion;
   * future work may determine an interface for module developers
   * to request this value be published or hidden.
   */
  energyConsumed?: bigint;

  /**
   * The `Reducer` enum defined by the `moduleBindings`, which encodes which reducer ran and its arguments.
   */
  reducer: Reducer;
};
Type UpdateStatus
type UpdateStatus =
  | { tag: 'Committed'; value: __DatabaseUpdate }
  | { tag: 'Failed'; value: string }
  | { tag: 'OutOfEnergy' };
Name	Description
Committed variant	The reducer ran successfully.
Failed variant	The reducer errored.
OutOfEnergy variant	The reducer was aborted due to insufficient energy.
Variant Committed
{
  tag: 'Committed';
}
The reducer returned successfully and its changes were committed into the database state. An Event with tag: 'Reducer' passed to a row callback must have this status in its ReducerEvent.

Variant Failed
{
  tag: 'Failed';
  value: string;
}
The reducer returned an error, panicked, or threw an exception. The value is the stringified error message. Formatting of the error message is unstable and subject to change, so clients should use it only as a human-readable diagnostic, and in particular should not attempt to parse the message.

Variant OutOfEnergy
{
  tag: 'OutOfEnergy';
}
The reducer was aborted due to insufficient energy balance of the module owner.

Type Reducer
type Reducer =
  | { name: 'ReducerA'; args: ReducerA }
  | { name: 'ReducerB'; args: ReducerB }
The module bindings contains a type Reducer with a variant for each reducer defined by the module. Each variant has a field args containing the arguments to the reducer.

Type ReducerEventContext
A ReducerEventContext is a DbContext augmented with a field event: ReducerEvent. ReducerEventContexts are passed as the first argument to reducer callbacks.

Name	Description
event field	ReducerEvent containing reducer metadata.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field event
class ReducerEventContext {
  public event: ReducerEvent<Reducer>;
}
The ReducerEvent contained in the ReducerEventContext has metadata about the reducer which ran.

Field db
class ReducerEventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class ReducerEventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type SubscriptionEventContext
A SubscriptionEventContext is a DbContext. Unlike the other context types, SubscriptionEventContext doesn't have an event field. SubscriptionEventContexts are passed to subscription onApplied and unsubscribeThen callbacks.

Name	Description
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field db
class SubscriptionEventContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class SubscriptionEventContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Type ErrorContext
An ErrorContext is a DbContext augmented with a field event: Error. ErrorContexts are to connections' onDisconnect and onConnectError callbacks, and to subscriptions' onError callbacks.

Name	Description
event field	The error which caused the current error callback.
db field	Provides access to the client cache.
reducers field	Allows requesting reducers run on the remote database.
Field event
class ErrorContext {
  public event: Error;
}
Field db
class ErrorContext {
  public db: RemoteTables;
}
The db field of the context provides access to the subscribed view of the remote database's tables. See Access the client cache.

Field reducers
class ErrorContext {
  public reducers: RemoteReducers;
}
The reducers field of the context provides access to reducers exposed by the remote module. See Observe and invoke reducers.

Access the client cache
All DbContext implementors, including DbConnection and EventContext, have fields .db, which in turn has methods for accessing tables in the client cache.

Each table defined by a module has an accessor method, whose name is the table name converted to camelCase, on this .db field. The table accessor methods return table handles. Table handles have methods for accessing rows and registering onInsert and onDelete callbacks. Handles for tables which have a declared primary key field also expose onUpdate callbacks. Table handles also offer the ability to find subscribed rows by unique index.

Name	Description
Accessing rows	Iterate over or count subscribed rows.
onInsert callback	Register a function to run when a row is added to the client cache.
onDelete callback	Register a function to run when a row is removed from the client cache.
onUpdate callback	Register a function to run when a subscribed row is replaced with a new version.
Unique index access	Seek a subscribed row by the value in its unique or primary key column.
BTree index access	Not supported.
Accessing rows
Method count
class TableHandle {
  public count(): number;
}
Returns the number of rows of this table resident in the client cache, i.e. the total number which match any subscribed query.

Method iter
class TableHandle {
  public iter(): Iterable<Row>;
}
An iterator over all the subscribed rows in the client cache, i.e. those which match any subscribed query.

The Row type will be an autogenerated type which matches the row type defined by the module.

Callback onInsert
class TableHandle {
  public onInsert(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnInsert(callback: (ctx: EventContext, row: Row) => void): void;
}
The onInsert callback runs whenever a new row is inserted into the client cache, either when applying a subscription or being notified of a transaction. The passed EventContext contains an Event which can identify the change which caused the insertion, and also allows the callback to interact with the connection, inspect the client cache and invoke reducers.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnInsert may be used to un-register a previously-registered onInsert callback.

Callback onDelete
class TableHandle {
  public onDelete(callback: (ctx: EventContext, row: Row) => void): void;

  public removeOnDelete(callback: (ctx: EventContext, row: Row) => void): void;
}
The onDelete callback runs whenever a previously-resident row is deleted from the client cache.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnDelete may be used to un-register a previously-registered onDelete callback.

Callback onUpdate
class TableHandle {
  public onUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;

  public removeOnUpdate(
    callback: (ctx: EventContext, old: Row, new: Row) => void
  ): void;
}
The onUpdate callback runs whenever an already-resident row in the client cache is updated, i.e. replaced with a new row that has the same primary key.

Only tables with a declared primary key expose onUpdate callbacks. Handles for tables without a declared primary key will not have onUpdate or removeOnUpdate methods.

The Row type will be an autogenerated type which matches the row type defined by the module.

removeOnUpdate may be used to un-register a previously-registered onUpdate callback.

Unique constraint index access
For each unique constraint on a table, its table handle has a field whose name is the unique column name. This field is a unique index handle. The unique index handle has a method .find(desiredValue: Col) -> Row | undefined, where Col is the type of the column, and Row the type of rows. If a row with desiredValue in the unique column is resident in the client cache, .find returns it.

BTree index access
The SpacetimeDB TypeScript client SDK does not support non-unique BTree indexes.

Observe and invoke reducers
All DbContext implementors, including DbConnection and EventContext, have fields .reducers, which in turn has methods for invoking reducers defined by the module and registering callbacks on it.

Each reducer defined by the module has three methods on the .reducers:

An invoke method, whose name is the reducer's name converted to camel case, like setName. This requests that the module run the reducer.
A callback registation method, whose name is prefixed with on, like onSetName. This registers a callback to run whenever we are notified that the reducer ran, including successfully committed runs and runs we requested which failed. This method returns a callback id, which can be passed to the callback remove method.
A callback remove method, whose name is prefixed with removeOn, like removeOnSetName. This cancels a callback previously registered via the callback registration method.
Identify a client
Type Identity
Identity
A unique public identifier for a client connected to a database.

Type ConnectionId
ConnectionId
An opaque identifier for a client connection to a database, intended to differentiate between connections from the same Identity.