import { ErpProduct } from '../types';

interface ErpProductSearchResponse {
  items: ErpProduct[];
  total: number;
}

export async function searchErpProducts(query: string, limit = 20): Promise<ErpProduct[]> {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }

  const params = new URLSearchParams({
    q: keyword,
    limit: String(limit),
  });

  const response = await fetch(`/api/erp/products/search?${params.toString()}`);
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as ErpProductSearchResponse;
  return data.items ?? [];
}
