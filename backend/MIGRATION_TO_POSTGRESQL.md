# Migration from DuckDB to PostgreSQL

This document describes the migration from DuckDB to PostgreSQL that has been completed.

## Changes Made

### 1. Database Module
- **Created**: `backend/app/db/postgresql.py` - New PostgreSQL database module
- **Kept**: `backend/app/db/duckdb.py` - Old module kept for reference (can be removed later)

### 2. Database Schema
- **Updated**: `backend/app/db/schema.sql`
  - Changed `DOUBLE` to `DOUBLE PRECISION` for PostgreSQL compatibility
  - Changed `JSON` to `JSONB` for better PostgreSQL performance
  - Added PRIMARY KEY constraints
  - Added FOREIGN KEY constraints with CASCADE deletes
  - Added UNIQUE constraints where appropriate
  - Added indexes for better query performance
  - Added DEFAULT values for timestamps

### 3. Configuration
- **Updated**: `backend/app/config.py`
  - Added `postgresql_url` setting
  - Kept `duckdb_path` for backward compatibility (deprecated)

### 4. Dependencies
- **Updated**: `backend/requirements.txt`
  - Added `psycopg2-binary==2.9.9`
  - Removed `duckdb==1.1.3` (can be removed if not needed elsewhere)

### 5. Code Updates
- **Updated all imports**: Changed from `app.db.duckdb` to `app.db.postgresql` in:
  - `app/main.py`
  - `app/api/routes/*.py` (all route files)
  - `app/services/*.py` (all service files)
  - `app/auth/dependencies.py`

- **Updated JSON handling**: Modified to handle PostgreSQL JSONB which returns Python dicts directly:
  - `app/services/notification_service.py`
  - `app/services/in_app_notification_service.py`

- **Parameter placeholders**: Automatically converted from `?` (DuckDB) to `%s` (PostgreSQL) in the database module

### 6. Environment Configuration
- **Updated**: `backend/env.example`
  - Added `POSTGRESQL_URL` configuration
  - Marked `DUCKDB_PATH` as deprecated

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file in the `backend` directory (or update your existing one):

```bash
POSTGRESQL_URL=postgresql://admin:4ecjK2gHKw3GJl1HdOxlYb3xnFfmXSLw@dpg-d535geu3jp1c738dendg-a.virginia-postgres.render.com/portikdb
```

Or use the internal URL if connecting from Render services:
```bash
POSTGRESQL_URL=postgresql://admin:4ecjK2gHKw3GJl1HdOxlYb3xnFfmXSLw@dpg-d535geu3jp1c738dendg-a/portikdb
```

### 3. Initialize Database
The database schema will be automatically created when you start the application. The `init_db()` function is called on startup and will:
- Create all tables if they don't exist
- Add any missing columns from migrations
- Create indexes for better performance

### 4. Start the Application
```bash
cd backend
uvicorn app.main:app --reload
```

## Features

### Connection Pooling
The PostgreSQL module uses `ThreadedConnectionPool` for efficient connection management:
- Minimum connections: 1
- Maximum connections: 10
- Automatic connection reuse

### Automatic Parameter Conversion
- Query parameter placeholders are automatically converted from `?` to `%s`
- No changes needed in existing query code

### JSON/JSONB Support
- JSONB columns return Python dicts directly (no need to parse)
- Backward compatible with string JSON (handles both cases)

### UUID Support
- UUID types are properly registered with psycopg2
- UUIDs are automatically converted to strings in query results

## Migration Notes

### Data Migration
If you have existing data in DuckDB, you'll need to export and import it:

1. **Export from DuckDB** (if needed):
   ```python
   # Use DuckDB to export data to CSV or JSON
   ```

2. **Import to PostgreSQL**:
   - Use the existing API endpoints to import trades
   - Or write a migration script to bulk import data

### Rollback
If you need to rollback to DuckDB:
1. Change all imports back to `app.db.duckdb`
2. Reinstall `duckdb` package
3. Remove `psycopg2-binary` if not needed
4. Update environment to use `DUCKDB_PATH` instead of `POSTGRESQL_URL`

## Testing

After migration, test the following:
- [ ] User registration and login
- [ ] Trade creation and listing
- [ ] Journal entries
- [ ] Analytics and portfolio calculations
- [ ] Broker connections
- [ ] Notifications

## Troubleshooting

### Connection Errors
- Verify `POSTGRESQL_URL` is set correctly
- Check network connectivity to PostgreSQL server
- Verify credentials are correct

### Schema Errors
- Check PostgreSQL version (requires PostgreSQL 9.5+ for JSONB)
- Ensure user has CREATE TABLE permissions

### JSON Errors
- JSONB columns should work automatically
- If you see JSON parsing errors, check the JSON handling code in service files

