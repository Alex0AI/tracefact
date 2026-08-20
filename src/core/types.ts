export const OATS_VERSION = "1.0.0" as const;

export type EventKind =
  | "message"
  | "tool_call"
  | "tool_result"
  | "file_change"
  | "test"
  | "browser_action"
  | "error"
  | "artifact"
  | "claim"
  | "metric";

export interface TraceSource {
  adapter: string;
  adapterVersion: string;
  provider?: string;
  format?: string;
  url?: string;
  commitSha?: string;
  importedAt: string;
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface TraceEvent {
  id: string;
  parentId?: string;
  kind: EventKind;
  timestamp: string;
  durationMs?: number;
  actor?: "user" | "assistant" | "system" | "tool" | "browser";
  name?: string;
  status?: "started" | "succeeded" | "failed" | "cancelled" | "unknown";
  input?: unknown;
  output?: unknown;
  content?: string;
  error?: {
    type?: string;
    message: string;
    stack?: string;
    retryable?: boolean;
  };
  file?: {
    path: string;
    operation: "create" | "update" | "delete";
    diff?: string;
    sha256?: string;
  };
  test?: {
    command?: string;
    passed: number;
    failed: number;
    skipped?: number;
    output?: string;
  };
  browser?: {
    action: string;
    url?: string;
    selector?: string;
    screenshotSha256?: string;
  };
  artifact?: {
    name: string;
    mediaType?: string;
    path?: string;
    sha256: string;
    size?: number;
  };
  usage?: Usage;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

export interface AgentTrace {
  schemaVersion: typeof OATS_VERSION | string;
  traceId: string;
  task: { title: string; description?: string; expected?: string[] };
  startedAt: string;
  endedAt?: string;
  status: "success" | "failure" | "partial" | "unknown";
  source: TraceSource;
  agent: { name: string; version?: string; model?: string; provider?: string };
  environment?: {
    os?: string;
    arch?: string;
    runtime?: string;
    cwd?: string;
    git?: { repository?: string; commitSha?: string; dirty?: boolean };
    dependencies?: Record<string, string>;
  };
  events: TraceEvent[];
  artifacts?: Array<{
    name: string;
    sha256: string;
    mediaType?: string;
    size?: number;
  }>;
  labels?: Record<string, string>;
  extensions?: Record<string, unknown>;
}

export type EvidenceStrength =
  | "supported"
  | "weak"
  | "unsupported"
  | "conflicting";

export interface EvidenceEdge {
  claimId: string;
  evidenceId: string;
  relation: "supports" | "contradicts" | "mentions";
  reason: string;
  weight: number;
}

export interface EvidenceClaim {
  id: string;
  text: string;
  sourceEventId: string;
  strength: EvidenceStrength;
  evidenceIds: string[];
  explanation: string;
}

export interface EvidenceGraph {
  claims: EvidenceClaim[];
  evidence: TraceEvent[];
  edges: EvidenceEdge[];
  summary: Record<EvidenceStrength, number>;
}

export type FailureCode =
  | "invalid_loop"
  | "repeated_tool_call"
  | "retrieval_drift"
  | "unverified_change"
  | "test_failure"
  | "hallucinated_completion"
  | "cost_spike"
  | "premature_termination"
  | "failed_recovery";

export interface Finding {
  code: FailureCode;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  evidenceEventIds: string[];
  confidence: number;
  remediation: string;
}

export interface ReliabilityMetrics {
  durationMs: number;
  eventCount: number;
  toolCalls: number;
  toolFailures: number;
  uniqueTools: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  evidenceCoverage: number;
  reproducibility: number;
  recoveryRate: number;
  uncertainty: string[];
}

export interface ReliabilityReport {
  reportVersion: "1.0.0";
  generatedAt: string;
  trace: AgentTrace;
  evidenceGraph: EvidenceGraph;
  findings: Finding[];
  metrics: ReliabilityMetrics;
  integrity: { algorithm: "sha256"; traceHash: string };
}

export interface ReplayCapsule {
  capsuleVersion: "1.0.0";
  createdAt: string;
  trace: AgentTrace;
  report: ReliabilityReport;
  manifest: {
    redacted: boolean;
    source: TraceSource;
    environment?: AgentTrace["environment"];
    files: Array<{ path: string; sha256: string; bytes: number }>;
    capsuleHash?: string;
  };
}
