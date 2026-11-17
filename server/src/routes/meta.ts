import { Router } from "express";
import { prisma } from "../db.js";

// Public reference data used by forms (register, listing, filters)
export const metaRouter = Router();

metaRouter.get("/locations", async (_req, res) => {
  const districts = await prisma.district.findMany({ orderBy: { name: "asc" }, include: { upazilas: { orderBy: { name: "asc" }, select: { id: true, name: true } } } });
  res.json({ districts: districts.map((d) => ({ id: d.id, name: d.name, nameBn: d.nameBn, upazilas: d.upazilas })) });
});

metaRouter.get("/products", async (_req, res) => {
  res.json({ products: await prisma.product.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }) });
});
