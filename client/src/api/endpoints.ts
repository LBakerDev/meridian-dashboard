import { buildQuery, request } from './client.ts'
import type {
  Commitment,
  CommitmentListParams,
  CommitRequest,
  Fund,
  FundListParams,
  Paginated,
  PortfolioSummary,
} from './types.ts'

/** One function per endpoint in docs/API.md. Components use the hooks in queries.ts, not these. */
export const api = {
  getSummary: (signal?: AbortSignal) =>
    request<PortfolioSummary>('/portfolio/summary', { signal }),

  listCommitments: (params: CommitmentListParams = {}, signal?: AbortSignal) =>
    request<Paginated<Commitment>>(`/commitments${buildQuery({ ...params })}`, { signal }),

  getCommitment: (id: string, signal?: AbortSignal) =>
    request<Commitment>(`/commitments/${encodeURIComponent(id)}`, { signal }),

  listFunds: (params: FundListParams = {}, signal?: AbortSignal) =>
    request<Paginated<Fund>>(`/funds${buildQuery({ ...params })}`, { signal }),

  commitToFund: (fundId: string, body: CommitRequest) =>
    request<Commitment>(`/funds/${encodeURIComponent(fundId)}/commitments`, { method: 'POST', body }),
}
