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

export const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const IssueAdminUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'escalated'] as const).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assigned_department: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
  resolution_images: z.array(z.string()).optional().nullable(),
  billing_cost: z.number().optional().nullable(),
  escalated: z.boolean().optional(),
  escalation_notes: z.string().optional().nullable(),
  escalation_admin_response: z.string().optional().nullable(),
}).passthrough();

export type IssueAdminUpdateInput = z.infer<typeof IssueAdminUpdateSchema>;

export const CommentCreateSchema = z.object({
  content: z.string().trim().min(1, "Comment content is required"),
});

export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
