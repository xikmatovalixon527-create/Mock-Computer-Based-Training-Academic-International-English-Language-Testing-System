import { neon } from '@neondatabase/serverless';

let client: any = null;
let isDbMigrated = false;

async function runMigrations(db: any) {
  if (isDbMigrated) return;
  isDbMigrated = true;
  try {
    await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name TEXT;`;
    await db`
      CREATE TABLE IF NOT EXISTS live_drafts (
        student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        task_type TEXT NOT NULL,
        topic_text TEXT NOT NULL,
        content_task1 TEXT,
        content_task2 TEXT,
        active_tab INTEGER DEFAULT 1,
        last_active TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    try {
      await db`ALTER TABLE reviews ALTER COLUMN ta_band DROP NOT NULL;`;
      await db`ALTER TABLE reviews ALTER COLUMN cc_band DROP NOT NULL;`;
      await db`ALTER TABLE reviews ALTER COLUMN lr_band DROP NOT NULL;`;
      await db`ALTER TABLE reviews ALTER COLUMN gra_band DROP NOT NULL;`;
    } catch (bandMigrationErr) {
      console.warn("Bands alteration warning:", bandMigrationErr);
    }
  } catch (err) {
    console.error("Automated migration execution failed:", err);
    isDbMigrated = false;
  }
}

function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not configured. Add your Neon connection string.');
    }
    client = neon(url);
    // Fire migrations in background
    runMigrations(client).catch(console.error);
  }
  return client;
}

// Lazy query executor that handles tag template literals or direct queries safely
export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const c = getSql();
  return c(strings, ...values);
};

export default sql;
