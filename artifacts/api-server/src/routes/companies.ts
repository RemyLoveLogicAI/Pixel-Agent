import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companiesTable, insertCompanySchema } from "@workspace/db";
import { ApiError } from "../middlewares/error-handler.js";

const router = Router();

router.get("/companies", async (_req, res, next) => {
  try {
    const companies = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

router.post("/companies", async (req, res, next) => {
  try {
    const parsed = insertCompanySchema.safeParse({
      id: crypto.randomUUID(),
      ...req.body,
    });
    if (!parsed.success) {
      return next(new ApiError(400, parsed.error.message));
    }
    const [company] = await db.insert(companiesTable).values(parsed.data).returning();
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

router.get("/companies/:companyId", async (req, res, next) => {
  try {
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.params.companyId));
    if (!company) return next(new ApiError(404, "Company not found"));
    res.json(company);
  } catch (err) {
    next(err);
  }
});

router.patch("/companies/:companyId", async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, req.params.companyId));
    if (!existing) return next(new ApiError(404, "Company not found"));

    const updateCompanySchema = insertCompanySchema.partial().omit({ id: true });
        const updatePayloadResult = updateCompanySchema.safeParse(req.body);
        if (!updatePayloadResult.success) {
          return next(new ApiError(400, updatePayloadResult.error.message));
        }

        const [updated] = await db
          .update(companiesTable)
          .set({ ...updatePayloadResult.data, updatedAt: new Date() })
      .where(eq(companiesTable.id, req.params.companyId))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/companies/:companyId", async (req, res, next) => {
  try {
    const result = await db
      .delete(companiesTable)
      .where(eq(companiesTable.id, req.params.companyId))
      .returning();
    if (result.length === 0) return next(new ApiError(404, "Company not found"));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
