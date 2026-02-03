export type BugReportStatus = 'pending' | 'in_progress' | 'resolved';

export interface BugReportScreenshot {
  id: string;
  bug_report_id: string;
  storage_path: string;
  position: number;
  created_at: string;
  signedUrl?: string;
}

export interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: BugReportStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  screenshots?: BugReportScreenshot[];
}
