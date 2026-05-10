/**
 * Parser para snapshots Markdown exportados a partir da checklist LastSticker
 * (ex.: salvar página como Markdown via ferramenta de leitura ou copiar tabela).
 *
 * Não faz scraping HTTP — sites com Cloudflare bloqueiam bots.
 */

export interface ParsedSticker {
  albumLabel: string;
  sortIndex: number;
  displayName: string;
  section: string;
  stickerType: string;
  sourceUrl?: string;
  category: string;
  isSpecial: boolean;
  teamName: string | null;
}

const LABEL_RE = /^(?:\d{1,4}x?|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/;

const STRUCTURAL_SECTIONS = new Set(
  [
    'introduction',
    'stadiums',
    "host cities' posters",
    'host cities’ posters',
    'fifa world cup legends',
    'poster',
    'legends',
  ].map((s) => s.toLowerCase())
);

function splitCells(line: string): string[] {
  return line
    .trim()
    .split('|')
    .map((c) => normalizeCell(c))
    .filter((c) => c !== '');
}

function normalizeCell(cell: string): string {
  return cell
    .trim()
    .replace(/\\-/g, '-')
    .replace(/^\*\*(.+)\*\*$/s, '$1')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(cell: string): { name: string; url?: string } {
  const m = cell.match(/^\[([^\]]+)\]\((https?:[^)]+)\)\s*(.*)$/);
  if (m) {
    const suffix = normalizeCell(m[3] ?? '');
    return {
      name: suffix ? `${m[1].trim()} ${suffix}` : m[1].trim(),
      url: m[2].trim(),
    };
  }
  return { name: cell.trim() };
}

function normalizeSection(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function classify(sectionNorm: string, titleNorm: string, stickerType: string) {
  const sec = sectionNorm.toLowerCase();
  const st = stickerType.toLowerCase();

  let category = 'player';
  let isSpecial = st === 'metal' || st.includes('update');

  if (sec === 'stadiums') {
    category = 'stadium';
    isSpecial = false;
  } else if (sec.includes('host cities') && sec.includes('poster')) {
    category = 'poster';
    isSpecial = false;
  } else if (sec === 'introduction') {
    category = 'intro';
  } else if (sec === 'fifa world cup legends') {
    category = 'legend';
  } else if (sec === 'poster') {
    category = 'poster';
  }

  const tl = titleNorm.toLowerCase();
  if (tl === 'emblem' || tl.includes('logo oficial')) {
    category = 'logo';
  }
  if (tl === 'team photo') {
    category = 'team_photo';
    isSpecial = false;
  }

  const teamName =
    STRUCTURAL_SECTIONS.has(sec) || category === 'stadium' || category === 'poster' || category === 'intro'
      ? null
      : sectionNorm;

  return { category, isSpecial, teamName };
}

function parseRow(cells: string[], sortIndex: number): ParsedSticker | null {
  const label = cells[0];
  if (!LABEL_RE.test(label)) return null;

  const raw1 = cells[1] ?? '';
  const raw2 = cells[2] ?? '';
  const raw3 = cells[3] ?? '';

  const raw4 = cells[4] ?? '';

  const { name: titlePart, url } = extractTitle(raw1);

  let section = normalizeSection(raw2);
  let stickerType = normalizeSection(raw3);
  let displayName = titlePart;
  let sourceUrl = url;

  // "| 20 | Host cities' posters | - | 193 | ..." — coluna Section ausente (título = seção)
  if (raw3 === '-' && /^\d+$/.test(raw4) && !raw1.includes('[')) {
    section = normalizeSection(titlePart);
    stickerType = '-';
    displayName = titlePart;
  }

  // Linhas quebradas tipo "| 3 | Introduction | metal | ..." (célula de título vazia no HTML)
  else if ((stickerType === 'metal' || stickerType === '-') && !raw1.includes('[')) {
    section = normalizeSection(raw1);
    stickerType = normalizeSection(raw2);
    displayName = `${section} · #${label}`;
    sourceUrl = undefined;
  }

  // Cartões só com nome repetindo seção (ex. posters host cities)
  if (!displayName || displayName === '-') {
    displayName = section;
  }

  const { category, isSpecial, teamName } = classify(section, displayName, stickerType);

  return {
    albumLabel: label,
    sortIndex,
    displayName,
    section,
    stickerType,
    sourceUrl,
    category,
    isSpecial,
    teamName,
  };
}

function tableRows(md: string): string[] {
  const rows: string[] = [];
  let pending: string | null = null;

  for (const line of md.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    if (t.startsWith('|')) {
      if (pending) rows.push(pending);
      pending = t;
    } else if (pending) {
      pending = `${pending} ${t}`;
    } else {
      continue;
    }

    if (pending && splitCells(pending).length >= 4) {
      rows.push(pending);
      pending = null;
    }
  }

  if (pending) rows.push(pending);
  return rows;
}

/** Interpreta checklist completa a partir do texto Markdown da página LastSticker. */
export function parseLastStickerMarkdown(md: string): ParsedSticker[] {
  const out: ParsedSticker[] = [];
  let sortIndex = 0;

  for (const line of tableRows(md)) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = splitCells(t);
    if (cells.length < 4) continue;
    if (cells[0].startsWith('---') || cells[0].includes('All-Argentina')) continue;

    const parsed = parseRow(cells, sortIndex + 1);
    if (!parsed) continue;
    sortIndex += 1;
    out.push(parsed);
  }

  return out;
}
