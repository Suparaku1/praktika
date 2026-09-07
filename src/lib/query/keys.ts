/**
 * Central query-key factory. Every useQuery/invalidateQueries call site should
 * use these helpers so cache invalidation stays consistent across the app.
 */
export const qk = {
  // CRM
  crmLeads: () => ["crm-leads"] as const,
  crmLead: (id: string) => ["crm-lead", id] as const,
  crmNotes: (id: string) => ["crm-notes", id] as const,
  crmTasks: (id: string) => ["crm-tasks", id] as const,

  // Vocational workflow
  winnerJobs: () => ["winners-jobs"] as const,
  shortlistJobs: () => ["shortlist-jobs"] as const,
  shortlistJob: (jobId: string) => ["shortlist-job", jobId] as const,
  feedbackContracts: () => ["feedback-contracts"] as const,

  // Core modules
  contractsList: () => ["contracts-list"] as const,
  classesList: () => ["classes-list"] as const,
  certificatesList: () => ["certificates-list"] as const,
  schoolReports: () => ["school-reports"] as const,
} as const;
