export type DesktopImportUploadResponse = {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
};

export type DesktopImportValidationResponse = {
  schemaVersion: string;
  members: number;
  subscriptions: number;
  isValid: boolean;
};

export type DesktopImportExecuteResponse = {
  jobId: string;
  status: string;
  artifactId: string;
  preImportBackupId: string;
  preImportArtifactId: string;
  report: Record<string, unknown>;
};

export type DesktopImportJobStatusResponse = {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  started_at: string;
  finished_at: string;
};
