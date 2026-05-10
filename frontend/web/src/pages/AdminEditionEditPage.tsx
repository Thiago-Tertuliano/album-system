import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchAdminEdition,
  fetchAdminCoverAssets,
  fetchAdminPages,
  fetchAdminStickers,
  importAdminLastStickerMarkdown,
  startAdminCacheStickerImagesJob,
  updateAdminEdition,
  updateAdminPage,
  updateAdminSticker,
  type AdminStickerSlot,
  type AlbumPageRow,
  type CoverAsset,
  type Edition,
  type EditionPatch,
} from '../api';

function editionToPatch(edition: Edition): EditionPatch {
  return {
    name: edition.name,
    year: edition.year,
    host_country: edition.host_country ?? '',
    publisher: edition.publisher,
    cover_image_url: edition.cover_image_url ?? '',
    status: edition.status as EditionPatch['status'],
    estimated_pack_price_cents: edition.estimated_pack_price_cents,
    collector_notes: edition.collector_notes,
  };
}

export default function AdminEditionEditPage() {
  const { id } = useParams<{ id: string }>();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [pages, setPages] = useState<AlbumPageRow[]>([]);
  const [stickers, setStickers] = useState<AdminStickerSlot[]>([]);
  const [covers, setCovers] = useState<CoverAsset[]>([]);
  const [markdown, setMarkdown] = useState('');
  const [runCacheJob, setRunCacheJob] = useState(true);
  const [includeExtraSets, setIncludeExtraSets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    Promise.all([fetchAdminEdition(id), fetchAdminPages(id), fetchAdminStickers(id), fetchAdminCoverAssets()])
      .then(([editionRow, pageRows, stickerRows, coverRows]) => {
        if (cancelled) return;
        setEdition(editionRow);
        setPages(pageRows);
        setStickers(stickerRows);
        setCovers(coverRows);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateEdition<K extends keyof Edition>(key: K, value: Edition[K]) {
    setEdition((current) => (current ? { ...current, [key]: value } : current));
  }

  function updatePageLocal(pageId: string, patch: Partial<AlbumPageRow>) {
    setPages((current) => current.map((page) => (page.id === pageId ? { ...page, ...patch } : page)));
  }

  function updateStickerLocal(stickerId: string, patch: Partial<AdminStickerSlot>) {
    setStickers((current) =>
      current.map((sticker) => (sticker.id === stickerId ? { ...sticker, ...patch } : sticker))
    );
  }

  async function saveEdition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !edition) return;
    setSaving(true);
    setMessage(null);
    setErr(null);
    try {
      const updated = await updateAdminEdition(id, editionToPatch(edition));
      setEdition(updated);
      setMessage('Edição salva.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function importMarkdown() {
    if (!id || !markdown.trim()) return;
    setSaving(true);
    setMessage(null);
    setErr(null);
    try {
      const result = await importAdminLastStickerMarkdown(id, markdown, {
        status: edition?.status as EditionPatch['status'],
        runCacheJob,
        includeExtraSets,
      });
      const [editionRow, pageRows, stickerRows] = await Promise.all([
        fetchAdminEdition(result.editionId),
        fetchAdminPages(result.editionId),
        fetchAdminStickers(result.editionId),
      ]);
      setEdition(editionRow);
      setPages(pageRows);
      setStickers(stickerRows);
      setMarkdown('');
      const details = [
        result.total_filtered ? `${result.total_filtered} extras filtrados` : null,
        result.duplicates_skipped ? `${result.duplicates_skipped} duplicadas ignoradas` : null,
      ].filter(Boolean);
      setMessage(
        `Importação concluída: ${result.stickersInserted} figurinhas${
          result.total_parsed && result.total_parsed !== result.stickersInserted
            ? ` de ${result.total_parsed} linhas parseadas`
            : ''
        }${details.length ? ` (${details.join(', ')}).` : '.'}${
          result.cache_job_started ? ' Job de imagens iniciado.' : ''
        }`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="loading">Carregando admin...</p>;
  if (err && !edition) return <div className="error-box">{err}</div>;
  if (!edition) return <div className="error-box">Edição não encontrada.</div>;

  return (
    <section className="admin-shell">
      <Link to="/admin/editions">Voltar</Link>
      <h1 className="page-title">{edition.name}</h1>
      <p className="page-sub">
        {edition.slug} · {edition.sticker_total} figurinhas · status {edition.status}
      </p>

      {err ? <div className="error-box">{err}</div> : null}
      {message ? <div className="success-box">{message}</div> : null}

      <form className="admin-card admin-form" onSubmit={saveEdition}>
        <h2>Metadados</h2>
        <div className="admin-grid">
          <label>
            Nome
            <input value={edition.name} onChange={(event) => updateEdition('name', event.target.value)} />
          </label>
          <label>
            Ano
            <input
              value={edition.year}
              onChange={(event) => updateEdition('year', Number(event.target.value))}
              type="number"
            />
          </label>
          <label>
            País-sede
            <input
              value={edition.host_country ?? ''}
              onChange={(event) => updateEdition('host_country', event.target.value)}
            />
          </label>
          <label>
            Editora
            <input value={edition.publisher} onChange={(event) => updateEdition('publisher', event.target.value)} />
          </label>
          <label>
            Status
            <select value={edition.status} onChange={(event) => updateEdition('status', event.target.value)}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label>
            Preço do pacote (centavos)
            <input
              value={edition.estimated_pack_price_cents ?? ''}
              onChange={(event) =>
                updateEdition(
                  'estimated_pack_price_cents',
                  event.target.value ? Number(event.target.value) : null
                )
              }
              type="number"
            />
          </label>
        </div>
        <label>
          Capa do diretório
          <select
            value={edition.cover_image_url ?? ''}
            onChange={(event) => updateEdition('cover_image_url', event.target.value)}
          >
            <option value="">Sem capa</option>
            {edition.cover_image_url && !covers.some((cover) => cover.path === edition.cover_image_url) ? (
              <option value={edition.cover_image_url}>{edition.cover_image_url}</option>
            ) : null}
            {covers.map((cover) => (
              <option key={cover.path} value={cover.path}>
                {cover.filename}
              </option>
            ))}
          </select>
          <span className="field-hint">Adicione imagens em backend/public/covers para aparecerem aqui.</span>
        </label>
        <button className="button-primary" type="submit" disabled={saving}>
          Salvar metadados
        </button>
      </form>

      <section className="admin-card admin-form">
        <h2>Importação guiada</h2>
        <p className="page-sub">Substitui páginas e figurinhas desta edição em transação.</p>
        <textarea
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={10}
          placeholder="Cole aqui o snapshot Markdown"
        />
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
        <button className="button-secondary" type="button" onClick={importMarkdown} disabled={saving || !markdown.trim()}>
          Importar checklist
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={() =>
            startAdminCacheStickerImagesJob(edition.id, { includeExtraSets }).then(() =>
              setMessage('Job de imagens iniciado.')
            )
          }
          disabled={saving || edition.sticker_total === 0}
        >
          Rodar job de imagens agora
        </button>
      </section>

      <section className="admin-card">
        <h2>Páginas</h2>
        <div className="admin-table-wrap">
          <table className="admin-table compact">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Título</th>
                <th>Preview</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <input
                      value={page.page_number}
                      onChange={(event) => updatePageLocal(page.id, { page_number: Number(event.target.value) })}
                      type="number"
                    />
                  </td>
                  <td>
                    <input
                      value={page.title ?? ''}
                      onChange={(event) => updatePageLocal(page.id, { title: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={page.preview_image_url ?? ''}
                      onChange={(event) => updatePageLocal(page.id, { preview_image_url: event.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => updateAdminPage(page.id, page).then(() => setMessage('Página salva.'))}
                    >
                      Salvar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Figurinhas</h2>
        <p className="page-sub">Mostrando até 1000 registros para correções pontuais.</p>
        <div className="admin-table-wrap">
          <table className="admin-table compact">
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Label</th>
                <th>Nome</th>
                <th>Time</th>
                <th>Categoria</th>
                <th>Imagem</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {stickers.map((sticker) => (
                <tr key={sticker.id}>
                  <td>
                    <input
                      value={sticker.sort_index}
                      onChange={(event) => updateStickerLocal(sticker.id, { sort_index: Number(event.target.value) })}
                      type="number"
                    />
                  </td>
                  <td>
                    <input
                      value={sticker.album_label}
                      onChange={(event) => updateStickerLocal(sticker.id, { album_label: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={sticker.display_name}
                      onChange={(event) => updateStickerLocal(sticker.id, { display_name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={sticker.team_name ?? ''}
                      onChange={(event) => updateStickerLocal(sticker.id, { team_name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={sticker.category}
                      onChange={(event) => updateStickerLocal(sticker.id, { category: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={sticker.image_url ?? ''}
                      onChange={(event) => updateStickerLocal(sticker.id, { image_url: event.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => updateAdminSticker(sticker.id, sticker).then(() => setMessage('Figurinha salva.'))}
                    >
                      Salvar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
