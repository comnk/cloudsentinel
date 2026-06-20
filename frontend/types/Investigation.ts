export type Investigation = {
  id: string;
  anomalyId: number;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  severity: string;
  summary: string | null;
  rootCause: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
};

export type InvestigationEvent = {
  id: string;
  investigationId: string;
  eventType: string;
  description: string;
  timestamp: string;
};

export type InvestigationEvidence = {
  id: string;
  investigationId: string;
  evidenceType: string;
  content: string;
};

export type InvestigationDetail = {
  investigation: Investigation;
  timeline: InvestigationEvent[];
  evidence: InvestigationEvidence[];
};
