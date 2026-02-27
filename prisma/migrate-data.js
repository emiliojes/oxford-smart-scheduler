import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const sqliteDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const db = new sqlite3.Database(sqliteDbPath);
  
  const postgres = new PrismaClient();

  console.log('Reading teachers from SQLite at:', sqliteDbPath);
  
  db.all("SELECT * FROM Teacher", async (err, rows) => {
    if (err) {
      console.error('Error reading SQLite:', err);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('No teachers found in SQLite.');
      db.close();
      return;
    }

    console.log(`Found ${rows.length} teachers. Migrating to Postgres...`);

    for (const row of rows) {
      try {
        const emailToUse = row.email && row.email !== "" ? row.email : null;
        
        await postgres.teacher.create({
          data: {
            name: row.name,
            email: emailToUse,
            level: row.level,
            primaryType: row.primaryType,
            maxWeeklyHours: parseInt(row.maxWeeklyHours) || 27,
          },
        });
        console.log(`Migrated: ${row.name}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`Skipped (already exists): ${row.name}`);
        } else {
          console.error(`Failed to migrate ${row.name}:`, error);
        }
      }
    }
    
    console.log('Migration finished.');
    db.close();
    await postgres.$disconnect();
  });
}

migrate();
