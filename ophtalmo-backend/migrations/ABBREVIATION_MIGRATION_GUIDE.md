# Abbreviation API Migration Guide

## Overview
This migration adds proper user relationship support to the abbreviation table and implements custom API routes with server-side filtering.

## Changes

### 1. Database Schema Changes
- Added `user_id` UUID column with foreign key to `user_table(id)`
- Added index on `user_id` for query performance
- Updated `schema.sql` for new installations

### 2. Migration for Existing Databases
Run the migration script to update existing databases:

```bash
cd ophtalmo-backend
psql $DATABASE_URL -f migrations/add-user-id-to-abbreviation.sql
```

This will:
- Add the `user_id` column
- Create the index
- Migrate existing data (sets user_id based on created_by email)

### 3. API Changes

#### Custom Routes
The Abbreviation API now has custom routes instead of using generic CRUD:

**GET /api/Abbreviation**
- Returns global abbreviations (is_global=true) + user's own abbreviations
- Requires authentication
- Automatically filters by user_id

**GET /api/Abbreviation/:id**
- Returns a specific abbreviation if it's global or owned by the user
- Requires authentication

**POST /api/Abbreviation**
- Creates a new abbreviation
- Automatically sets user_id from authenticated user
- Request body: `{ abbreviation, full_text, description?, is_global? }`
- No need to manually send `created_by` or `user_id`

**PUT /api/Abbreviation/:id**
- Updates an abbreviation
- Only allows updating user's own abbreviations
- Request body: `{ abbreviation?, full_text?, description?, is_global? }`

**DELETE /api/Abbreviation/:id**
- Soft deletes an abbreviation
- Only allows deleting user's own abbreviations

### 4. Frontend Changes
- Removed redundant client-side filtering (now done server-side)
- Removed manual `created_by` field from POST requests
- Updated `useAbbreviationExpansion.js` hook
- Updated `Gestion.jsx` page

## Testing

### Manual Testing Steps

1. **Start the backend server:**
   ```bash
   cd ophtalmo-backend
   npm install
   npm start
   ```

2. **Login and get a token:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

3. **List abbreviations (should return 200, not 404):**
   ```bash
   curl -X GET http://localhost:3001/api/Abbreviation \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Create an abbreviation:**
   ```bash
   curl -X POST http://localhost:3001/api/Abbreviation \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"abbreviation":"test","full_text":"test expansion"}'
   ```

5. **Verify it appears in the list:**
   ```bash
   curl -X GET http://localhost:3001/api/Abbreviation \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Security Notes

### Rate Limiting
The custom Abbreviation routes follow the same pattern as existing routes in the codebase. However, **rate limiting is not implemented** on any routes (existing issue, not introduced by this change).

**Recommendation:** Add rate limiting to all API routes using express-rate-limit:
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
```

### User Ownership
The new implementation properly enforces user ownership:
- Users can only update/delete their own abbreviations
- Users can see global abbreviations + their own
- user_id is automatically set from authenticated user (prevents spoofing)

## Rollback

If you need to rollback:

1. **Remove custom routes** from `server.js` (lines 639-830)
2. **Add Abbreviation back to ENTITIES** object
3. **Optionally remove user_id column:**
   ```sql
   ALTER TABLE abbreviation DROP COLUMN IF EXISTS user_id;
   ```

## Compatibility

- Frontend: Updated to work with new server-side filtering
- Backward compatible with existing abbreviation data
- Migration preserves all existing data
