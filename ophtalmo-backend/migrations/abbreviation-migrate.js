-- Migration to fix the abbreviation table.
-- This script drops the existing table to ensure a clean, correct schema and then recreates it.

DO $$
BEGIN
    -- Drop the table completely to remove any and all schema inconsistencies.
    RAISE NOTICE 'Dropping table "abbreviation" if it exists...';
    DROP TABLE IF EXISTS abbreviation;

    -- Recreate the table with the exact schema that the application's server.js expects.
    RAISE NOTICE 'Creating table "abbreviation" with the correct schema...';
    CREATE TABLE abbreviation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        abbreviation VARCHAR(50) NOT NULL,
        full_text TEXT NOT NULL,
        description VARCHAR(255),
        is_global BOOLEAN DEFAULT FALSE,
        user_id UUID REFERENCES user_table(id) ON DELETE CASCADE,
        created_by VARCHAR(255),
        created_date TIMESTAMP DEFAULT NOW(),
        updated_date TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
    );

    -- Add necessary indexes for performance.
    RAISE NOTICE 'Creating indexes on "abbreviation" table...';
    CREATE INDEX idx_abbreviation_abbrev ON abbreviation(abbreviation);
    CREATE INDEX idx_abbreviation_global ON abbreviation(is_global);
    CREATE INDEX idx_abbreviation_user_id ON abbreviation(user_id);
    
    RAISE NOTICE 'SUCCESS: The "abbreviation" table has been dropped and recreated successfully.';

END $$;
