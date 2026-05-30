/**
 * Seed script for Hermes species_catalog table.
 * Loads built-in .rpet species definitions into PostgreSQL.
 *
 * Usage: npx tsx seedHermesSpecies.ts
 */
import { db, speciesCatalogTable, eq } from '@workspace/db';
import { loadRpet } from '@hermes/pets';
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

const SPECIES: SpeciesSeed[] = [
  {
    id: 'frygar',
    displayName: 'Frygar',
    role: 'fire',
    rpetPath: path.join(__dirname, '../../../../../../hermes-harness/tests/fixtures/frygar.rpet'),
  },
];

async function seed() {
  console.log('🌱 Seeding Hermes species catalog...');

  for (const species of SPECIES) {
    // Check if already exists
    const existing = await db
      .select()
      .from(speciesCatalogTable)
      .where(eq(speciesCatalogTable.id, species.id));

    if (existing.length > 0) {
      console.log(`  ⏭  ${species.displayName} already exists, skipping`);
      continue;
    }

    // Load and validate .rpet
    const raw = fs.readFileSync(species.rpetPath, 'utf-8');
    const rpetDef = loadRpet(raw);

    // Insert into species_catalog
    const [inserted] = await db
      .insert(speciesCatalogTable)
      .values({
        id: species.id,
        displayName: species.displayName,
        role: species.role,
        rpetVersion: rpetDef.formatVersion,
        rpetContent: JSON.parse(raw),
      })
      .returning();

    console.log(`  ✅ ${inserted.displayName} (id: ${inserted.id}, version: ${inserted.rpetVersion})`);
  }

  console.log('🌱 Done seeding Hermes species catalog');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
