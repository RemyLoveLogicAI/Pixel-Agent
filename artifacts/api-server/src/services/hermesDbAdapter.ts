// Drizzle-backed DbAdapter for @hermes/api.
// This module lives in the Pixel-Agent context and bridges Hermes API routes to PostgreSQL.

import { db, speciesCatalogTable, petInstancesTable, eq, and } from '@workspace/db';
import type { DbAdapter } from '@hermes/api';

export function createDrizzleAdapter(): DbAdapter {
  return {
    species: {
      async list() {
        return db.select().from(speciesCatalogTable).orderBy(speciesCatalogTable.displayName);
      },
      async getById(id: string) {
        const [row] = await db
          .select()
          .from(speciesCatalogTable)
          .where(eq(speciesCatalogTable.id, id));
        return row;
      },
      async create(data: any) {
        const [row] = await db.insert(speciesCatalogTable).values(data).returning();
        return row;
      },
    },
    pets: {
      async listByCompany(companyId: string) {
        return db
          .select()
          .from(petInstancesTable)
          .where(eq(petInstancesTable.companyId, companyId))
          .orderBy(petInstancesTable.createdAt);
      },
      async getById(id: string, companyId: string) {
        const [row] = await db
          .select()
          .from(petInstancesTable)
          .where(
            and(
              eq(petInstancesTable.id, id),
              eq(petInstancesTable.companyId, companyId),
            ),
          );
        return row;
      },
      async create(data: any) {
        const [row] = await db.insert(petInstancesTable).values(data).returning();
        return row;
      },
      async updateState(id: string, companyId: string, state: string) {
        // Fetch current state for history
        const [existing] = await db
          .select()
          .from(petInstancesTable)
          .where(
            and(
              eq(petInstancesTable.id, id),
              eq(petInstancesTable.companyId, companyId),
            ),
          );

        if (!existing) return undefined;

        const history = (existing.stateHistory as any[]) || [];
        history.push({ state: existing.currentState, timestamp: new Date().toISOString() });

        const [updated] = await db
          .update(petInstancesTable)
          .set({
            currentState: state,
            stateHistory: history,
            updatedAt: new Date(),
          })
          .where(eq(petInstancesTable.id, id))
          .returning();

        return updated;
      },
    },
  };
}
