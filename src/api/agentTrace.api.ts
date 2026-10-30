// Decision traces (buy planner B3; backend/app/agent/trace.py node_to_dict, agent/trace_views.py): the tree
// behind a number, read for "See the numbers". One GET returns every node, so nothing is fetched lazily.
//
// Values are decimal strings, as the backend writes them; a trace is read under the same store scope as the
// page that shows it (a store's trace under its header, a company trace only for a role that sees every store,
// a what-if trace only by whoever asked it).

import axiosServices from 'utils/axios';

export type TraceUnit = 'units' | 'usd' | 'ratio' | 'pct' | 'days' | 'weeks' | 'count' | 'units_per_day';

export interface TraceValue {
  amount: string | null;
  unit: TraceUnit | string;
  low: string | null;
  high: string | null;
}

export type EvidenceStatus =
  | 'measured'
  | 'measured_series'
  | 'unproven'
  | 'insufficient'
  | 'no_effect'
  | 'assumed'
  | 'owner_stated'
  | 'policy'
  | 'estimated'
  | 'unobserved';

export interface TraceNode {
  key: string;
  kind: 'number' | 'evidence' | 'rule' | 'owner' | 'flag' | 'informational' | string;
  label: string;
  value: TraceValue | null;
  formula: { text: string; inputs: string[] } | null;
  evidence: {
    source: string;
    status: EvidenceStatus | string;
    n: number | null;
    window: Record<string, unknown> | null;
    provenance: Record<string, unknown>;
    series: unknown[] | null;
  } | null;
  children: string[];
  tags: string[];
  sentence: string;
  composer: string;
}

export interface Trace {
  trace_id: string;
  subject: { type: string; id: string };
  revision: number;
  as_of: string | null;
  engine_version: string;
  method_version: number;
  fingerprint: string;
  root: string;
  nodes: Record<string, TraceNode>;
}

export const getTrace = async (traceId: string, locationId?: string | null): Promise<{ trace: Trace }> => {
  const { data } = await axiosServices.get(`/agent/traces/${traceId}/`, locationId ? { headers: { 'X-Location-Id': locationId } } : {});
  return data;
};
