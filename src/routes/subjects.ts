import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();
// Get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    const offset = (currentPage - 1) * limitPerPage;

    const filterCondition = [];
    // If search query is provided
    if (search) {
      const searchPattern = `%${String(search).replace(/[%_]/g, "\\%")}%`;
      filterCondition.push(
        or(
          ilike(subjects.name, searchPattern),
          ilike(subjects.code, searchPattern),
        ),
      );
    }

    // If departmentId filter is provided
    if (department) {
      const deptPattern = `%${String(department).replace(/[%_]/g, "\\%")}%`;
      filterCondition.push(ilike(departments.code, deptPattern));
    }

    //Combine all fillters
    const whereClause =
      filterCondition.length > 0 ? and(...filterCondition) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;

    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          ...getTableColumns(departments),
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .limit(limitPerPage)
      .orderBy(desc(subjects.createdAt))
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

export default router;
