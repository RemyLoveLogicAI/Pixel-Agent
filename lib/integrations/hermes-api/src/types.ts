// DbAdapter interface — abstracts database access for @hermes/api.
// In production, this is backed by @workspace/db (Drizzle + PostgreSQL).
// For testing, a mock implementation can be provided.

export interface DbAdapter {
  species: {
    list(): Promise<any[]>;
    getById(id: string): Promise<any | undefined>;
    create(data: any): Promise<any>;
  };
  pets: {
    listByCompany(companyId: string): Promise<any[]>;
    getById(id: string, companyId: string): Promise<any | undefined>;
    create(data: any): Promise<any>;
    updateState(id: string, companyId: string, state: string): Promise<any | undefined>;
  };
}
