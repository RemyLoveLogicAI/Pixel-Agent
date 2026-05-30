/**
 * Seed Hermes species_catalog with built-in .rpet species.
 *
 * Usage: npx tsx artifacts/api-server/src/scripts/seedHermesSpecies.ts
 * Requires: DATABASE_URL environment variable
 */
import { db, speciesCatalogTable, eq } from '@workspace/db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SpeciesSeed {
  id: string;
  displayName: string;
  role: string;
  rpetPath: string;
}

// Resolve path to frygar.rpet relative to workspace root
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../../../..');
const SPECIES: SpeciesSeed[] = [
  {
    id: 'frygar',
    displayName: 'Frygar',
    role: 'fire',
    rpetPath: path.join(WORKSPACE_ROOT, 'hermes-harness/tests/fixtures/frygar.rpet'),
  },
];

async function seed() {
  console.log('Seeding Hermes species catalog...');

  for (const species of SPECIES) {
    // Check if already exists
    const existing = await db
      .select()
      .from(speciesCatalogTable)
      .where(eq(speciesCatalogTable.id, species.id));

    if (existing.length > 0) {
      console.log(`  SKIP: ${species.displayName} already exists`);
      continue;
    }

    if (!fs.existsSync(species.rpetPath)) {
      console.error(`  ERROR: .rpet file not found at ${species.rpetPath}`);
      continue;
    }

    const raw = fs.readFileSync(species.rpetPath, 'utf-8');
    const rpetDef = JSON.parse(raw);

    const [inserted] = await db
      .insert(speciesCatalogTable)
      .values({
        id: species.id,
        displayName: species.displayName,
        role: species.role,
        rpetVersion: rpetDef.formatVersion ?? 1,
        rpetContent: rpetDef,
      })
      .returning();

    console.log(`  OK: ${inserted.displayName} (id=${inserted.id}, version=${inserted.rpetVersion})`);
  }

  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
