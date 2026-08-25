/**
 * Screen prose, EN + ES.
 *
 * Separate from `phrases.ts`, which holds the things that cannot be plain
 * strings — counted phrases and the pinned calendar tables. This is the flat
 * half: plain strings and simple templates.
 *
 * ⚠ The shape is declared EXPLICITLY below rather than inferred from the Spanish
 * with `as const`. Inferring it makes every literal its own type, so `Copy`
 * demands English also return `"Clasificación"` — the same trap `phrases.ts`
 * documents, which is why every counted phrase there annotates `: string`.
 * Declaring the interface is what makes the shape shared rather than the words.
 *
 * ⚠ Brand strings are NOT localised and NOT edited: **AltaGama FC**, one word,
 * no space. `Alta Gama FC` is a retired spelling.
 */

import type { ZoneKind } from '@/lib/cronogol/leagues';

export interface Copy {
  tabs: { today: string; matchdays: string; table: string; clubs: string };
  table: {
    title: string;
    pos: string;
    club: string;
    played: string;
    points: string;
    statLabels: readonly [string, string, string, string, string, string];
    formLabel: (n: number) => string;
    openClub: (name: string) => string;
    afterMatchday: (n: number, total: number) => string;
    clubCount: (n: number) => string;
    zoneLabels: Record<ZoneKind, string>;
    footnote: string;
    empty: string;
    error: string;
    retry: string;
  };
}

export const esCopy: Copy = {
  tabs: { today: 'Hoy', matchdays: 'Jornadas', table: 'Clasificación', clubs: 'Clubes' },

  table: {
    title: 'Clasificación',
    pos: '#',
    club: 'Club',
    played: 'PJ',
    points: 'PTS',
    statLabels: ['G', 'E', 'P', 'GF', 'GC', 'DG'],
    /** "ÚLTIMOS 4" */
    formLabel: (n: number) => `Últimos ${n}`,
    openClub: (name: string) => `Abrir ${name}`,
    /** The caption when a matchday IS complete. */
    afterMatchday: (n: number, total: number) => `Tras la jornada ${n} de ${total}`,
    clubCount: (n: number) => `${n} clubes`,
    zoneLabels: {
      ucl: 'Champions League',
      uel: 'Europa League',
      conf: 'Conference League',
      rel: 'Descenso',
    },
    /** ⚠ Names the ~3h lag AND that bands are config, per the handoff. */
    footnote:
      'La tabla se actualiza unas horas después del pitido final. Las plazas europeas y de descenso son configuración nuestra, no del proveedor.',
    empty: 'Todavía no hay clasificación para esta liga.',
    error: 'No se ha podido cargar la clasificación.',
    retry: 'Reintentar',
  },
};

export const enCopy: Copy = {
  tabs: { today: 'Today', matchdays: 'Matchdays', table: 'Table', clubs: 'Clubs' },

  table: {
    title: 'Table',
    pos: '#',
    club: 'Club',
    played: 'PL',
    points: 'PTS',
    statLabels: ['W', 'D', 'L', 'GF', 'GA', 'GD'],
    formLabel: (n: number) => `Last ${n}`,
    openClub: (name: string) => `Open ${name}`,
    afterMatchday: (n: number, total: number) => `After MD ${n} of ${total}`,
    clubCount: (n: number) => `${n} clubs`,
    zoneLabels: {
      ucl: 'Champions League',
      uel: 'Europa League',
      conf: 'Conference League',
      rel: 'Relegation',
    },
    footnote:
      'The table settles a few hours after the final whistle. European and relegation places are our own configuration, not the provider’s.',
    empty: 'No table for this league yet.',
    error: 'Could not load the table.',
    retry: 'Try again',
  },
};

export const COPY = { es: esCopy, en: enCopy } as const;
