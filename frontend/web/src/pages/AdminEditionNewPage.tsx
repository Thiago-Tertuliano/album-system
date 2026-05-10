import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createAdminEdition,
  fetchAdminCoverAssets,
  importAdminLastStickerMarkdown,
  type CoverAsset,
  type EditionInput,
} from '../api';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeEditionInput(input: EditionInput): EditionInput {
  return {
    ...input,
    slug: slugify(input.slug || input.name),
    host_country: input.host_country?.trim() || null,
    cover_image_url: input.cover_image_url?.trim() || null,
    publisher: input.publisher?.trim() || 'Panini',
  };
}

export default function AdminEditionNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<EditionInput>({
    slug: '',
    name: '',
    year: new Date().getFullYear(),
    host_country: '',
    publisher: 'Panini',
    cover_image_url: '',
    status: 'published',
    estimated_pack_price_cents: null,
  });
  const [markdown, setMarkdown] = useState('');
  const [covers, setCovers] = useState<CoverAsset[]>([]);
  const [runCacheJob, setRunCacheJob] = useState(true);
  const [includeExtraSets, setIncludeExtraSets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCoverAssets()
      .then((items) => {
        if (!cancelled) setCovers(items);
      })
      .catch(() => {
        if (!cancelled) setCovers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof EditionInput>(key: K, value: EditionInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const normalized = normalizeEditionInput(form);
      const created = await createAdminEdition(normalized);
      if (markdown.trim()) {
        await importAdminLastStickerMarkdown(created.id, markdown, {
          status: normalized.status,
          runCacheJob,
          includeExtraSets,
        });
      }
      navigate(`/admin/editions/${created.id}/edit`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="admin-shell">
      <Link to="/admin/editions">Voltar</Link>
      <h1 className="page-title">Nova edição</h1>
      <p className="page-sub">Crie o rascunho e, se desejar, importe o checklist no mesmo fluxo.</p>

      <form className="admin-card admin-form" onSubmit={handleSubmit}>
        <div className="admin-grid">
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(event) => updateField('slug', slugify(event.target.value))}
              placeholder="gerado pelo nome se vazio"
            />
          </label>
          <label>
            Nome
            <input
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  slug: current.slug ? current.slug : slugify(name),
                }));
              }}
              required
            />
          </label>
          <label>
            Ano
            <input
              value={form.year}
              onChange={(event) => updateField('year', Number(event.target.value))}
              type="number"
              required
            />
          </label>
          <label>
            País-sede
            <input
              value={form.host_country ?? ''}
              onChange={(event) => updateField('host_country', event.target.value)}
            />
          </label>
          <label>
            Editora
            <input
              value={form.publisher ?? ''}
              onChange={(event) => updateField('publisher', event.target.value)}
              required
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value as EditionInput['status'])}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>

        <label>
          Capa do diretório
          <select
            value={form.cover_image_url ?? ''}
            onChange={(event) => updateField('cover_image_url', event.target.value)}
          >
            <option value="">Sem capa</option>
            {covers.map((cover) => (
              <option key={cover.path} value={cover.path}>
                {cover.filename}
              </option>
            ))}
          </select>
          <span className="field-hint">Adicione imagens em backend/public/covers para aparecerem aqui.</span>
        </label>

        <label>
          Snapshot Markdown do checklist
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={12}
            placeholder="Cole aqui a tabela Markdown exportada do checklist"
          />
        </label>

        <label className="checkbox-line">
          <input
            checked={runCacheJob}
            onChange={(event) => setRunCacheJob(event.target.checked)}
            type="checkbox"
          />
          Rodar automaticamente o job de imagens desta edição após importar
        </label>

        <label className="checkbox-line">
          <input
            checked={includeExtraSets}
            onChange={(event) => setIncludeExtraSets(event.target.checked)}
            type="checkbox"
          />
          Incluir extras/update sets do LastSticker
        </label>

        {err ? <p className="error-text">{err}</p> : null}
        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Criar edição'}
        </button>
      </form>
    </section>
  );
}
