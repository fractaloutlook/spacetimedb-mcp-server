Crate spacetimedb Copy item path
Source
Search
Settings
Help

Summary
SpacetimeDB Rust Module Library
SpacetimeDB allows using the Rust language to write server-side applications called modules. Modules, which run inside a relational database, have direct access to database tables, and expose public functions called reducers that can be invoked over the network. Clients connect directly to the database to read data.

    Client Application                          SpacetimeDB
┌───────────────────────┐                ┌───────────────────────┐
│                       │                │                       │
│  ┌─────────────────┐  │    SQL Query   │  ┌─────────────────┐  │
│  │ Subscribed Data │<─────────────────────│    Database     │  │
│  └─────────────────┘  │                │  └─────────────────┘  │
│           │           │                │           ^           │
│           │           │                │           │           │
│           v           │                │           v           │
│  +─────────────────┐  │ call_reducer() │  ┌─────────────────┐  │
│  │   Client Code   │─────────────────────>│   Module Code   │  │
│  └─────────────────┘  │                │  └─────────────────┘  │
│                       │                │                       │
└───────────────────────┘                └───────────────────────┘
Rust modules are written with the the Rust Module Library (this crate). They are built using cargo and deployed using the spacetime CLI tool. Rust modules can import any Rust crate that supports being compiled to WebAssembly.

(Note: Rust can also be used to write clients of SpacetimeDB databases, but this requires using a different library, the SpacetimeDB Rust Client SDK. See the documentation on clients for more information.)

This reference assumes you are familiar with the basics of Rust. If you aren’t, check out Rust’s excellent documentation. For a guided introduction to Rust Modules, see the Rust Module Quickstart.

Overview
SpacetimeDB modules have two ways to interact with the outside world: tables and reducers.

Tables store data and optionally make it readable by clients.

Reducers are functions that modify data and can be invoked by clients over the network. They can read and write data in tables, and write to a private debug log.

These are the only ways for a SpacetimeDB module to interact with the outside world. Calling functions from std::net or std::fs inside a reducer will result in runtime errors.

Declaring tables and reducers is straightforward:

use spacetimedb::{table, reducer, ReducerContext, Table};

#[table(name = player)]
pub struct Player {
    id: u32,
    name: String
}

#[reducer]
fn add_person(ctx: &ReducerContext, id: u32, name: String) {
    log::debug!("Inserting {name} with id {id}");
    ctx.db.player().insert(Player { id, name });
}
Note that reducers don’t return data directly; they can only modify the database. Clients connect directly to the database and use SQL to query public tables. Clients can also subscribe to a set of rows using SQL queries and receive streaming updates whenever any of those rows change.

Tables and reducers in Rust modules can use any type that implements the SpacetimeType trait.

Setup
To create a Rust module, install the spacetime CLI tool in your preferred shell. Navigate to your work directory and run the following command:

spacetime init --lang rust --project-path my-project-directory my-project
This creates a Cargo project in my-project-directory with the following Cargo.toml:

[package]
name = "spacetime-module"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
spacetimedb = "1.0.0"
log = "0.4"
This is a standard Cargo.toml, with the exception of the line crate-type = ["cdylib"]. This line is important: it allows the project to be compiled to a WebAssembly module.

The project’s lib.rs will contain the following skeleton:

use spacetimedb::{ReducerContext, Table};

#[spacetimedb::table(name = person)]
pub struct Person {
    name: String
}

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    // Called when the module is initially published
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
    // Called everytime a new client connects
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {
    // Called everytime a client disconnects
}

#[spacetimedb::reducer]
pub fn add(ctx: &ReducerContext, name: String) {
    ctx.db.person().insert(Person { name });
}

#[spacetimedb::reducer]
pub fn say_hello(ctx: &ReducerContext) {
    for person in ctx.db.person().iter() {
        log::info!("Hello, {}!", person.name);
    }
    log::info!("Hello, World!");
}
This skeleton declares a table, some reducers, and some lifecycle reducers.

To compile the project, run the following command:

spacetime build
SpacetimeDB requires a WebAssembly-compatible Rust toolchain. If the spacetime cli finds a compatible version of rustup that it can run, it will automatically install the wasm32-unknown-unknown target and use it to build your application. This can also be done manually using the command:

rustup target add wasm32-unknown-unknown
If you are managing your Rust installation in some other way, you will need to install the wasm32-unknown-unknown target yourself.

To build your application and upload it to the public SpacetimeDB network, run:

spacetime login
And then:

spacetime publish [MY_DATABASE_NAME]
For example:

spacetime publish silly_demo_app
When you publish your module, a database named silly_demo_app will be created with the requested tables, and the module will be installed inside it.

The output of spacetime publish will end with a line:

Created new database with name: <name>, identity: <hex string>
This name is the human-readable name of the created database, and the hex string is its Identity. These distinguish the created database from the other databases running on the SpacetimeDB network. They are used when administering the application, for example using the spacetime logs <DATABASE_NAME> command. You should probably write the database name down in a text file so that you can remember it.

After modifying your project, you can run:

spacetime publish <DATABASE_NAME>

to update the module attached to your database. Note that SpacetimeDB tries to automatically migrate your database schema whenever you run spacetime publish.

You can also generate code for clients of your module using the spacetime generate command. See the client SDK documentation for more information.

How it works
Under the hood, SpacetimeDB modules are WebAssembly modules that import a specific WebAssembly ABI and export a small number of special functions. This is automatically configured when you add the spacetime crate as a dependency of your application.

The SpacetimeDB host is an application that hosts SpacetimeDB databases. Its source code is available under the Business Source License with an Additional Use Grant. You can run your own host, or you can upload your module to the public SpacetimeDB network. The network will create a database for you and install your module in it to serve client requests.

In More Detail: Publishing a Module
The spacetime publish [DATABASE_IDENTITY] command compiles a module and uploads it to a SpacetimeDB host. After this:

The host finds the database with the requested DATABASE_IDENTITY.
(Or creates a fresh database and identity, if no identity was provided).
The host loads the new module and inspects its requested database schema. If there are changes to the schema, the host tries perform an automatic migration. If the migration fails, publishing fails.
The host terminates the old module attached to the database.
The host installs the new module into the database. It begins running the module’s lifecycle reducers and scheduled reducers, starting with the #[init] reducer.
The host begins allowing clients to call the module’s reducers.
From the perspective of clients, this process is seamless. Open connections are maintained and subscriptions continue functioning. Automatic migrations forbid most table changes except for adding new tables, so client code does not need to be recompiled. However:

Clients may witness a brief interruption in the execution of scheduled reducers (for example, game loops.)
New versions of a module may remove or change reducers that were previously present. Client code calling those reducers will receive runtime errors.
Tables
Tables are declared using the #[table(name = table_name)] macro.

This macro is applied to a Rust struct with named fields. All of the fields of the table must implement SpacetimeType.

The resulting type is used to store rows of the table. It is normal struct type. Row values are not special – operations on row types do not, by themselves, modify the table. Instead, a ReducerContext is needed to get a handle to the table.

use spacetimedb::{table, reducer, ReducerContext, Table, UniqueColumn};

/// A `Person` is a row of the table `person`.
#[table(name = person, public)]
pub struct Person {
    #[primary_key]
    #[auto_inc]
    id: u64,
    #[index(btree)]
    name: String,
}

// `Person` is a normal Rust struct type.
// Operations on a `Person` do not, by themselves, do anything.
// The following function does not interact with the database at all.
fn do_nothing() {
    // Creating a `Person` DOES NOT modify the database.
    let mut person = Person { id: 0, name: "Joe Average".to_string() };
    // Updating a `Person` DOES NOT modify the database.
    person.name = "Joanna Average".to_string();
    // Dropping a `Person` DOES NOT modify the database.
    drop(person);
}

// To interact with the database, you need a `ReducerContext`,
// which is provided as the first parameter of any reducer.
#[reducer]
fn do_something(ctx: &ReducerContext) {
    // `ctx.db.{table_name}()` gets a handle to a database table.
    let person: &person__TableHandle = ctx.db.person();

    // The following inserts a row into the table:
    let mut example_person = person.insert(Person { id: 0, name: "Joe Average".to_string() });

    // `person` is a COPY of the row stored in the database.
    // If we update it:
    example_person.name = "Joanna Average".to_string();
    // Our copy is now updated, but the database's copy is UNCHANGED.
    // To push our change through, we can call `UniqueColumn::update()`:
    example_person = person.id().update(example_person);
    // Now the database and our copy are in sync again.
    
    // We can also delete the row in the database using `UniqueColumn::delete()`.
    person.id().delete(&example_person.id);
}
(See reducers for more information on declaring reducers.)

This library generates a custom API for each table, depending on the table’s name and structure.

All tables support getting a handle implementing the Table trait from a ReducerContext, using:

ctx.db.{table_name}()
For example,

ctx.db.person()
The Table trait provides:

Table::insert
Table::try_insert
Table::delete
Table::iter
Table::count
Tables’ constraints and indexes generate additional accessors.

Public and Private Tables
By default, tables are considered private. This means that they are only readable by the database owner and by reducers. Reducers run inside the database, so clients cannot see private tables at all.

Using the #[table(name = table_name, public)] flag makes a table public. Public tables are readable by all clients. They can still only be modified by reducers.

use spacetimedb::table;

// The `enemies` table can be read by all connected clients.
#[table(name = enemy, public)]
pub struct Enemy {
    /* ... */
}

// The `loot_items` table is invisible to clients, but not to reducers.
#[table(name = loot_item)]
pub struct LootItem {
    /* ... */
}
(Note that, when run by the module owner, the spacetime sql <SQL_QUERY> command can also read private tables. This is for debugging convenience. Only the module owner can see these tables. This is determined by the Identity stored by the spacetime login command. Run spacetime login show to print your current logged-in Identity.)

To learn how to subscribe to a public table, see the client SDK documentation.

Unique and Primary Key Columns
Columns of a table (that is, fields of a #[table] struct) can be annotated with #[unique] or #[primary_key]. Multiple columns can be #[unique], but only one can be #[primary_key]. For example:

use spacetimedb::table;

type SSN = String;
type Email = String;

#[table(name = citizen)]
pub struct Citizen {
    #[primary_key]
    id: u64,
    #[unique]
    ssn: SSN,
    #[unique]
    email: Email,
    name: String,
}
Every row in the table Person must have unique entries in the id, ssn, and email columns. Attempting to insert multiple Persons with the same id, ssn, or email will fail. (Either via panic, with Table::insert, or via a Result::Err, with Table::try_insert.)

Any #[unique] or #[primary_key] column supports getting a UniqueColumn from a ReducerContext using:

ctx.db.{table}().{unique_column}()
For example,

ctx.db.person().ssn()
UniqueColumn provides:

UniqueColumn::find
UniqueColumn::delete
UniqueColumn::update
Notice that updating a row is only possible if a row has a unique column – there is no update method in the base Table trait. SpacetimeDB has no notion of rows having an “identity” aside from their unique / primary keys.

The #[primary_key] annotation implies #[unique] annotation, but avails additional methods in the client-side SDKs.

It is not currently possible to mark a group of fields as collectively unique.

Filtering on unique columns is only supported for a limited number of types.

Auto-inc columns
Columns can be marked #[auto_inc]. This can only be used on integer types (i32, u8, etc.)

When inserting into a table with an #[auto_inc] column, if the annotated column is set to zero (0), the database will automatically overwrite that zero with an atomically increasing value.

Table::insert and Table::try_insert return rows with #[auto_inc] columns set to the values that were actually written into the database.

Note: The auto_inc number generator is not transactional. See the SEQUENCE section for more details.

use spacetimedb::{table, reducer, ReducerContext, Table};

#[table(name = example)]
struct Example {
    #[auto_inc]
    field: u32
}

#[reducer]
fn insert_auto_inc_example(ctx: &ReducerContext) {
    for i in 1..=10 {
        // These will have distinct, unique values
        // at rest in the database, since they
        // are inserted with the sentinel value 0.
        let actual = ctx.db.example().insert(Example { field: 0 });
        assert!(actual.field != 0);
    }
}
auto_inc is often combined with unique or primary_key to automatically assign unique integer identifiers to rows.

Indexes
SpacetimeDB supports both single- and multi-column B-Tree indexes.

Indexes are declared using the syntax:

#[table(..., index(name = my_index, btree(columns = [a, b, c]))].

For example:

use spacetimedb::table;

#[table(name = paper, index(name = url_and_country, btree(columns = [url, country])))]
struct Paper {
    url: String,
    country: String,
    venue: String
} 
Multiple indexes can be declared, separated by commas.

Single-column indexes can also be declared using the

#[index(btree)]

column attribute.

For example:

use spacetimedb::table;

#[table(name = paper)]
struct Paper {
    url: String,
    country: String,
    #[index(btree)]
    venue: String
} 
Any index supports getting a RangedIndex using ctx.db.{table}().{index}(). For example, ctx.db.person().name().

RangedIndex provides:

RangedIndex::filter
RangedIndex::delete
Only types which implement FilterableValue may be used as index keys.

Reducers
Reducers are declared using the #[reducer] macro.

#[reducer] is always applied to top level Rust functions. Arguments of reducers must implement SpacetimeType. Reducers can either return nothing, or return a Result<(), E>, where E implements std::fmt::Display.

use spacetimedb::{reducer, ReducerContext};
use std::fmt;

#[reducer]
fn give_player_item(
    ctx: &ReducerContext,
    player_id: u64,
    item_id: u64
) -> Result<(), String> {
    /* ... */
}
Every reducer runs inside a database transaction. This means that reducers will not observe the effects of other reducers modifying the database while they run. If a reducer fails, all of its changes to the database will automatically be rolled back. Reducers can fail by panicking or by returning an Err.

The ReducerContext Type
Reducers have access to a special ReducerContext parameter. This parameter allows reading and writing the database attached to a module. It also provides some additional functionality, like generating random numbers and scheduling future operations.

ReducerContext provides access to the database tables via the .db field. The #[table] macro generates traits that add accessor methods to this field.

The log crate
SpacetimeDB Rust modules have built-in support for the log crate. All modules automatically install a suitable logger when they are first loaded by SpacetimeDB. (At time of writing, this happens here). Log macros can be used anywhere in module code, and log outputs of a running module can be inspected using the spacetime logs command:

spacetime logs <DATABASE_IDENTITY>
Lifecycle Reducers
A small group of reducers are called at set points in the module lifecycle. These are used to initialize the database and respond to client connections. See Lifecycle Reducers.

Scheduled Reducers
Reducers can schedule other reducers to run asynchronously. This allows calling the reducers at a particular time, or at repeating intervals. This can be used to implement timers, game loops, and maintenance tasks. See Scheduled Reducers.

Automatic migrations
When you spacetime publish a module that has already been published using spacetime publish <DATABASE_NAME_OR_IDENTITY>, SpacetimeDB attempts to automatically migrate your existing database to the new schema. (The “schema” is just the collection of tables and reducers you’ve declared in your code, together with the types they depend on.) This form of migration is limited and only supports a few kinds of changes. On the plus side, automatic migrations usually don’t break clients. The situations that may break clients are documented below.

The following changes are always allowed and never breaking:

✅ Adding tables. Non-updated clients will not be able to see the new tables.
✅ Adding indexes.
✅ Adding or removing #[auto_inc] annotations.
✅ Changing tables from private to public.
✅ Adding reducers.
✅ Removing #[unique] annotations.
The following changes are allowed, but may break clients:

⚠️ Changing or removing reducers. Clients that attempt to call the old version of a changed reducer will receive runtime errors.
⚠️ Changing tables from public to private. Clients that are subscribed to a newly-private table will receive runtime errors.
⚠️ Removing #[primary_key] annotations. Non-updated clients will still use the old #[primary_key] as a unique key in their local cache, which can result in non-deterministic behavior when updates are received.
⚠️ Removing indexes. This is only breaking in some situations. The specific problem is subscription queries involving semijoins, such as:
SELECT Employee.*
FROM Employee JOIN Dept
ON Employee.DeptName = Dept.DeptName
)
For performance reasons, SpacetimeDB will only allow this kind of subscription query if there are indexes on Employee.DeptName and Dept.DeptName. Removing either of these indexes will invalidate this subscription query, resulting in client-side runtime errors.
The following changes are forbidden without a manual migration:

❌ Removing tables.
❌ Changing the columns of a table. This includes changing the order of columns of a table.
❌ Changing whether a table is used for scheduling.
❌ Adding #[unique] or #[primary_key] constraints. This could result in existing tables being in an invalid state.
Currently, manual migration support is limited. The spacetime publish --clear-database <DATABASE_IDENTITY> command can be used to COMPLETELY DELETE and reinitialize your database, but naturally it should be used with EXTREME CAUTION.

Re-exports
pub use log;
pub use rand08 as rand;
pub use spacetimedb_bindings_sys as sys;
pub use spacetimedb_lib;
pub use spacetimedb_lib::sats;
Modules
log_stopwatch
Macros
duration
Structs
AnonymousViewContext
One of two possible types that can be passed as the first argument to a #[view]. The other is ViewContext. Use this type if the view does not depend on the caller’s identity.
AuthCtx
Authentication information for the caller of a reducer.
AutoIncOverflow
An auto-inc column overflowed its data type.
ConnectionId
A unique identifier for a client connection to a SpacetimeDB database.
Errno
Error values used in the safe bindings API.
Identity
An Identity for something interacting with the database.
JwtClaims
The JWT of an AuthCtx.
Local
Allows accessing the local database attached to the module.
LocalReadOnly
The read-only version of Local
RangedIndex
A handle to a B-Tree index on a table.
RangedIndexReadOnly
A read-only handle to a B-tree index.
ReducerContext
The context that any reducer is provided with.
StdbRng
A reference to the random number generator for this reducer call.
TableId
An identifier for a table, unique within a database.
TimeDuration
A span or delta in time, measured in microseconds.
Timestamp
A point in time, measured in microseconds since the Unix epoch.
UniqueColumn
A handle to a unique index on a column. Available for #[unique] and #[primary_key] columns.
UniqueColumnReadOnly
A read-only handle to a unique (single-column) index.
UniqueConstraintViolation
A row operation was attempted that would violate a unique constraint.
ViewContext
One of two possible types that can be passed as the first argument to a #[view]. The other is AnonymousViewContext. Use this type if the view depends on the caller’s identity.
Enums
AlgebraicValue
A value in SATS typed at some AlgebraicType.
ScheduleAt
When a scheduled reducer should execute, either at a specific point in time, or at regular intervals for repeating schedules.
TryInsertError
The error type returned from Table::try_insert(), signalling a constraint violation.
Traits
DbContext
A handle on a database with a particular table schema.
Deserialize
A data structure that can be deserialized from any data format supported by the SpacetimeDB Algebraic Type System.
DeserializeOwned
A data structure that can be deserialized in SATS without borrowing any data from the deserializer.
FilterableValue
Types which can appear as an argument to an index filtering operation for a column of type Column.
Serialize
A data structure that can be serialized into any data format supported by the SpacetimeDB Algebraic Type System.
SpacetimeType
This trait makes types self-describing, allowing them to automatically register their structure with SpacetimeDB. This is used to tell SpacetimeDB about the structure of a module’s tables and reducers.
Table
Implemented for every TableHandle struct generated by the table macro. Contains methods that are present for every table, regardless of what unique constraints and indexes are present.
Type Aliases
ReducerResult
Attribute Macros
reducer
Marks a function as a spacetimedb reducer.
table
Declares a table with a particular row type.
Derive Macros
Deserialize
Serialize
SpacetimeType