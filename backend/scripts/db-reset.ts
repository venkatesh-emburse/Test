/**
 * db-reset.ts
 *
 * Wipes ALL data and drops ALL tables, then lets TypeORM (synchronize: true)
 * recreate a clean schema on the next `nest start`.
 *
 * Usage:
 *   npm run db:reset
 *
 * ⚠️  NEVER run this against a production database.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load env vars the same way the app does
dotenv.config();

import {
  User,
  Profile,
  Swipe,
  Match,
  Message,
  Signal,
  Report,
  SafetyVerification,
  OtpCode,
  RefreshToken,
} from '../src/database/entities';

async function resetDatabase(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'liveconnect',
    password: process.env.DB_PASSWORD || 'liveconnect_dev_password',
    database: process.env.DB_NAME || 'liveconnect',
    entities: [
      User,
      Profile,
      Swipe,
      Match,
      Message,
      Signal,
      Report,
      SafetyVerification,
      OtpCode,
      RefreshToken,
    ],
    synchronize: false, // we handle schema ourselves here
    logging: true,
  });

  console.log('🔌 Connecting to database…');
  await dataSource.initialize();

  // Always target the 'public' schema where app tables live.
  // (current_schema() can return 'topology' when PostGIS is installed,
  //  but all app entities are created in 'public'.)
  const schema = 'public';
  console.log(`🗑️  Dropping schema "${schema}" and all its objects…`);

  // Nuclear option: drop the entire schema + recreate it clean
  await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await dataSource.query(`CREATE SCHEMA "${schema}"`);

  // Restore default grants so the app user can still use the schema
  await dataSource.query(`GRANT ALL ON SCHEMA "${schema}" TO public`);

  // Reinstall extensions that live in public (wiped by the DROP above)
  await dataSource.query(
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "${schema}"`,
  );

  console.log('🏗️  Synchronising schema (recreating tables from entities)…');
  await dataSource.synchronize(); // creates all tables fresh

  await dataSource.destroy();

  console.log('✅ Database reset complete. All tables recreated, no data.');
}

resetDatabase().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
