import { Router, type Request, type Response, type NextFunction } from 'express';
import type { DbAdapter } from '../types.js';
import { insertSpeciesCatalogSchema } from './validation.js';

export function speciesRouter(db: DbAdapter): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const species = await db.species.list();
      res.json(species);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:speciesId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const species = await db.species.getById(req.params.speciesId as string);
      if (!species) {
        return res.status(404).json({ error: 'Species not found' });
      }
      return res.json(species);
    } catch (err) {
      next(err);
      return;
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = insertSpeciesCatalogSchema.safeParse({
        id: crypto.randomUUID(),
        ...req.body,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const species = await db.species.create(parsed.data);
      return res.status(201).json(species);
    } catch (err) {
      next(err);
      return;
    }
  });

  return router;
}
