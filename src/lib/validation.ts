import { z } from "zod";

/** Category enum for frontend color-coding: roads, water, sanitation, lighting, safety, parks */
export const ISSUE_CATEGORIES = [
  "roads",
  "water",
  "sanitation",
  "lighting",
  "safety",
  "parks",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const IssueCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  category: z.enum(ISSUE_CATEGORIES, {
    message: "Category must be one of: roads, water, sanitation, lighting, safety, parks"
  }),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
});

export type IssueCreateInput = z.infer<typeof IssueCreateSchema>;

export const IssueAdminUpdateSchema = z.object({
  status: z.string().min(1, "Status is required").optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type IssueAdminUpdateInput = z.infer<typeof IssueAdminUpdateSchema>;

export const CommentCreateSchema = z.object({
  content: z.string().trim().min(1, "Comment content is required"),
});

export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
