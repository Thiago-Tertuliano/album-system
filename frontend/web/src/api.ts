import { clearCollectorToken, getCollectorToken } from './auth/collectorToken';

/** Monta URL da API: dev usa proxy `/v1`; produção pode usar URL absoluta. */
export function apiUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
  return base ? `${base}${trimmed}` : trimmed;
}

/** Resolve assets servidos pelo backend, como `/static/covers/...`. */
export function assetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return apiUrl(path);
}

export type Edition = {
  id: string;
  slug: string;
  name: string;
  year: number;
  host_country: string | null;
  publisher: string;
  cover_image_url: string | null;
  sticker_total: number;
  status: string;
  estimated_pack_price_cents: number | null;
  collector_notes: Record<string, unknown> | null;
};

export type StickerSlot = {
  id: string;
  edition_id: string;
  page_id: string | null;
  album_label: string;
  sort_index: number;
  index_on_page: number | null;
  category: string;
  is_special: boolean;
  display_name: string;
  team_code: string | null;
  team_name: string | null;
  shirt_number: number | null;
  position: string | null;
  /** URL final para `<img>`: coluna do banco ou montada pelo backend via template. */
  image_url: string | null;
  owned: boolean;
  duplicate_count: number;
  preview_source_url?: string | null;
  metadata: Record<string, unknown> | null;
  page_number: number | null;
};

export type AlbumPageRow = {
  id: string;
  page_number: number;
  title: string | null;
  preview_image_url: string | null;
};

export type AdminStickerSlot = Omit<StickerSlot, 'owned' | 'duplicate_count' | 'preview_source_url'>;

export type EditionInput = {
  slug: string;
  name: string;
  year: number;
  host_country?: string | null;
  publisher?: string;
  cover_image_url?: string | null;
  status?: 'draft' | 'published' | 'archived';
  estimated_pack_price_cents?: number | null;
  collector_notes?: Record<string, unknown> | null;
};

export type EditionPatch = Partial<Omit<EditionInput, 'slug'>>;

export type ImportResult = {
  editionId: string;
  stickersInserted: number;
  cache_job_started?: boolean;
  total_parsed?: number;
  total_imported?: number;
  total_filtered?: number;
  duplicates_skipped?: number;
};

export type CoverAsset = {
  filename: string;
  path: string;
};

export type EditionSummary = {
  edition_id: string;
  total: number;
  owned: number;
  missing: number;
  percent: number;
};

export type CollectorSession = {
  token: string;
  expires_in: number;
  user: { id: string; email: string; display_name: string | null };
};

export const ADMIN_TOKEN_KEY = 'album_admin_token';

export function getAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error('Sessão administrativa expirada. Faça login novamente.');
  }
  return res;
}

async function readApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const data = (await res.json()) as {
      error?: { message?: string; fields?: Record<string, string[] | undefined> };
    };
    const fieldMessages = data.error?.fields
      ? Object.entries(data.error.fields)
          .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
          .join('; ')
      : '';
    return new Error([data.error?.message ?? fallback, fieldMessages].filter(Boolean).join(' - '));
  } catch {
    return new Error(fallback);
  }
}

async function collectorFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getCollectorToken();
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearCollectorToken();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return res;
}

export async function collectorRegister(
  email: string,
  password: string,
  displayName?: string
): Promise<CollectorSession> {
  const res = await fetch(apiUrl('/v1/auth/register'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (!res.ok) throw new Error(`Falha no cadastro (${res.status})`);
  return res.json() as Promise<CollectorSession>;
}

export async function collectorLogin(email: string, password: string): Promise<CollectorSession> {
  const res = await fetch(apiUrl('/v1/auth/collector/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Email ou senha inválidos (${res.status})`);
  return res.json() as Promise<CollectorSession>;
}

export async function fetchEditionSummary(slugOrId: string): Promise<EditionSummary> {
  const res = await collectorFetch(`/v1/me/editions/${encodeURIComponent(slugOrId)}/summary`);
  if (!res.ok) throw new Error(`Falha ao carregar progresso (${res.status})`);
  return res.json() as Promise<EditionSummary>;
}

export async function fetchEditions(): Promise<Edition[]> {
  const res = await fetch(apiUrl('/v1/editions'));
  if (!res.ok) throw new Error(`Falha ao listar edições (${res.status})`);
  const data = (await res.json()) as { items: Edition[] };
  return data.items;
}

export async function fetchEdition(slugOrId: string): Promise<Edition> {
  const res = await fetch(apiUrl(`/v1/editions/${encodeURIComponent(slugOrId)}`));
  if (res.status === 404) throw new Error('Edição não encontrada');
  if (!res.ok) throw new Error(`Falha ao carregar edição (${res.status})`);
  return res.json() as Promise<Edition>;
}

export async function fetchEditionPages(slugOrId: string): Promise<AlbumPageRow[]> {
  const res = await fetch(apiUrl(`/v1/editions/${encodeURIComponent(slugOrId)}/pages`));
  if (!res.ok) throw new Error(`Falha ao carregar páginas (${res.status})`);
  const data = (await res.json()) as { items: AlbumPageRow[] };
  return data.items;
}

/** Agrega todas as páginas do endpoint paginado (limite máx. 1000 por página na API). */
export async function fetchAllStickers(slugOrId: string): Promise<{ stickers: StickerSlot[]; total: number }> {
  const limit = 1000;
  let page = 1;
  const stickers: StickerSlot[] = [];
  let total = 0;

  for (;;) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await collectorFetch(
      `/v1/editions/${encodeURIComponent(slugOrId)}/stickers?${qs}`
    );
    if (!res.ok) throw new Error(`Falha ao carregar figurinhas (${res.status})`);
    const data = (await res.json()) as {
      items: StickerSlot[];
      total: number;
      page: number;
    };
    total = data.total;
    stickers.push(...data.items);
    if (stickers.length >= total || data.items.length === 0) break;
    page += 1;
  }

  return { stickers, total };
}

export async function updateStickerCollection(
  slugOrId: string,
  stickerId: string,
  patch: { owned?: boolean; duplicate_count?: number }
): Promise<Pick<StickerSlot, 'id' | 'owned' | 'duplicate_count'>> {
  const res = await collectorFetch(
    `/v1/me/editions/${encodeURIComponent(slugOrId)}/progress`,
    {
      method: 'PATCH',
      body: JSON.stringify({ slot_id: stickerId, ...patch }),
    }
  );
  if (!res.ok) throw new Error(`Falha ao atualizar coleção (${res.status})`);
  const data = (await res.json()) as {
    applied: { slot_id: string; owned: boolean; duplicate_count: number }[];
  };
  const row = data.applied[0];
  if (!row) throw new Error('Figurinha não encontrada');
  return { id: row.slot_id, owned: row.owned, duplicate_count: row.duplicate_count };
}

export async function adminLogin(email: string, password: string): Promise<void> {
  const res = await fetch(apiUrl('/v1/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Falha no login (${res.status})`);
  const data = (await res.json()) as { token: string };
  setAdminToken(data.token);
}

export async function fetchAdminEditions(): Promise<Edition[]> {
  const res = await adminFetch('/v1/admin/editions');
  if (!res.ok) throw new Error(`Falha ao listar edições admin (${res.status})`);
  const data = (await res.json()) as { items: Edition[] };
  return data.items;
}

export async function fetchAdminCoverAssets(): Promise<CoverAsset[]> {
  const res = await adminFetch('/v1/admin/assets/covers');
  if (!res.ok) throw new Error(`Falha ao listar capas (${res.status})`);
  const data = (await res.json()) as { items: CoverAsset[] };
  return data.items;
}

export async function fetchAdminEdition(id: string): Promise<Edition> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Falha ao carregar edição admin (${res.status})`);
  return res.json() as Promise<Edition>;
}

export async function createAdminEdition(input: EditionInput): Promise<Edition> {
  const res = await adminFetch('/v1/admin/editions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await readApiError(res, `Falha ao criar edição (${res.status})`);
  return res.json() as Promise<Edition>;
}

export async function updateAdminEdition(id: string, patch: EditionPatch): Promise<Edition> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar edição (${res.status})`);
  return res.json() as Promise<Edition>;
}

export async function deleteAdminEdition(id: string): Promise<void> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Falha ao excluir edição (${res.status})`);
}

export async function importAdminLastStickerMarkdown(
  id: string,
  markdown: string,
  options: { status?: EditionInput['status']; runCacheJob?: boolean; includeExtraSets?: boolean } = {}
): Promise<ImportResult> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}/import/laststicker-md`, {
    method: 'POST',
    body: JSON.stringify({
      markdown,
      status: options.status,
      run_cache_job: options.runCacheJob ?? false,
      include_extra_sets: options.includeExtraSets ?? false,
    }),
  });
  if (!res.ok) throw await readApiError(res, `Falha ao importar checklist (${res.status})`);
  return res.json() as Promise<ImportResult>;
}

export async function startAdminCacheStickerImagesJob(
  id: string,
  options: { includeExtraSets?: boolean } = {}
): Promise<void> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}/jobs/cache-sticker-images`, {
    method: 'POST',
    body: JSON.stringify({ include_extra_sets: options.includeExtraSets ?? false }),
  });
  if (!res.ok) throw new Error(`Falha ao iniciar job de imagens (${res.status})`);
}

export async function fetchAdminPages(id: string): Promise<AlbumPageRow[]> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}/pages`);
  if (!res.ok) throw new Error(`Falha ao carregar páginas admin (${res.status})`);
  const data = (await res.json()) as { items: AlbumPageRow[] };
  return data.items;
}

export async function updateAdminPage(
  pageId: string,
  patch: Partial<Pick<AlbumPageRow, 'page_number' | 'title' | 'preview_image_url'>>
): Promise<AlbumPageRow> {
  const res = await adminFetch(`/v1/admin/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar página (${res.status})`);
  return res.json() as Promise<AlbumPageRow>;
}

export async function fetchAdminStickers(id: string): Promise<AdminStickerSlot[]> {
  const res = await adminFetch(`/v1/admin/editions/${encodeURIComponent(id)}/stickers?limit=1000`);
  if (!res.ok) throw new Error(`Falha ao carregar figurinhas admin (${res.status})`);
  const data = (await res.json()) as { items: AdminStickerSlot[] };
  return data.items;
}

export async function updateAdminSticker(
  stickerId: string,
  patch: Partial<AdminStickerSlot>
): Promise<{ id: string; album_label: string; display_name: string; sort_index: number }> {
  const res = await adminFetch(`/v1/admin/stickers/${encodeURIComponent(stickerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar figurinha (${res.status})`);
  return res.json() as Promise<{ id: string; album_label: string; display_name: string; sort_index: number }>;
}
