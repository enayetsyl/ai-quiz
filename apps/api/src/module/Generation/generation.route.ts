import { Router } from "express";
import { enqueuePageGeneration } from "./generation.service";
import { prisma } from "../../lib/prisma";

const router = Router();

router.post("/requeue", async (req, res) => {
  const { pageId } = req.body as { pageId: string };
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return res.status(404).json({ error: "Page not found" });
  await enqueuePageGeneration(pageId);
  res.json({ ok: true });
});

router.post("/regenerate-page", async (req, res) => {
  const { pageId } = req.body as { pageId: string };
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return res.status(404).json({ error: "Page not found" });
  // delete existing questions for hard-replace
  await prisma.question.deleteMany({ where: { pageId } });
  await enqueuePageGeneration(pageId);
  res.json({ ok: true });
});


export const GenerationRoutes = router;

export default GenerationRoutes;