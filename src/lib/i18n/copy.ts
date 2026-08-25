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
  alerts: {
    eyebrow: (club: string, matches: number) => string;
    title: (club: string) => string;
    body: string;
    bullets: readonly [string, string, string];
    confirm: string;
    unsubscribe: string;
    cancel: string;
    footnote: string;
    unsubscribeTitle: (club: string) => string;
    unsubscribeBody: string;
  };
  onboarding: {
    pickTitle: string;
    pickBody: string;
    search: string;
    continueWith: (n: number) => string;
    skip: string;
    alertsTitle: string;
    alertsBody: string;
    allow: string;
    notNow: string;
    /** ⚠ Says alerts are not delivering yet. Honest, not a teaser. */
    pendingNote: string;
  };
  account: {
    title: string;
    /** ⚠ Anonymous v1 — there is no identity to show (ADR 0019). */
    notSignedIn: string;
    notSignedInBody: string;
    alertTypes: string;
    reminder: string;
    reminderNote: string;
    moved: string;
    movedNote: string;
    postponed: string;
    postponedNote: string;
    /** ⚠ Drawn DISABLED with its reason. Never remove the reason. */
    goals: string;
    goalsNote: string;
    preferences: string;
    language: string;
    clock: string;
    timezone: string;
    feeds: string;
    noFeeds: string;
    replayOnboarding: string;
    turnOffAlerts: string;
    turnOffAlertsNote: string;
  };
  sheets: {
    calendarTitle: (club: string) => string;
    calendarBody: string;
    jornadaTitle: (n: number) => string;
    jornadaBody: string;
    google: string;
    apple: string;
    download: string;
    snapshotNote: string;
    copyAction: string;
    copied: string;
    close: string;
    /** ⚠ Alerts are built but not delivering until the app ships. Say so. */
    alertsPendingNote: string;
  };
  today: {
    title: string;
    /** "SÁBADO · JORNADA 4" */
    eyebrow: (weekday: string) => string;
    inProgress: string;
    inPlayNote: string;
    kickoffIn: string;
    noScore: string;
    scoreAge: (hoursAgo: number | null) => string;
    tbd: string;
    finishedToday: string;
    finished: string;
    settleNote: string;
    upcoming: string;
    followTitle: string;
    followBody: string;
    browseAll: string;
    quiet: string;
  };
  club: {
    alertsOn: string;
    alertsOff: string;
    calendar: string;
    subscribeNote: string;
    fixtures: string;
    players: string;
    /** ⚠ `lastSyncedAt === null` — the pending state, NEVER a partial list. */
    noScheduleTitle: string;
    noScheduleBody: string;
    squadEmpty: string;
    bandLabels: Record<'GK' | 'DEF' | 'MID' | 'FWD', string>;
    roundPrefix: string;
    notFound: string;
  };
  clubs: {
    title: string;
    search: (n: number) => string;
    subscribed: string;
    browse: (league: string) => string;
    follow: string;
    schedulePending: string;
    fullSeason: (n: number) => string;
    noResults: string;
    error: string;
    retry: string;
  };
  matchdays: {
    title: (n: number) => string;
    /** "LALIGA 2026/27 · PRIMERA VUELTA" */
    eyebrow: (league: string, season: string, half: string | null) => string;
    firstHalf: string;
    secondHalf: string;
    midweek: string;
    addAll: (n: number) => string;
    /** Shown under the title when kickoffs are provisional. */
    timesPending: string;
    missing: (n: number) => string;
    finished: string;
    empty: string;
    error: string;
    retry: string;
  };
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

  alerts: {
    eyebrow: (club: string, matches: number) => `${club} · ${matches} partidos`.toUpperCase(),
    title: (club: string) => `Sigue al ${club} toda la temporada`,
    body: 'Una sola suscripción. No hay opción por partido, y es a propósito.',
    bullets: [
      'Aviso 30 minutos antes de cada partido',
      'Te avisamos si cambia la hora o la fecha',
      'Y si se aplaza o se suspende',
    ],
    confirm: 'Confirmar y seguir',
    unsubscribe: 'Dejar de seguir',
    cancel: 'Cancelar',
    footnote: 'Puedes dejar de seguirlo en un toque desde la pestaña Clubes.',
    unsubscribeTitle: (club: string) => `¿Dejar de seguir al ${club}?`,
    unsubscribeBody:
      'Dejarás de recibir avisos. El calendario que ya añadiste sigue en tu app de calendario hasta que lo borres allí.',
  },

  onboarding: {
    pickTitle: '¿A quién sigues?',
    pickBody:
      'Elige tus clubes. Su temporada entera entra en tu calendario y te avisamos si cambia un horario.',
    search: 'Buscar un club',
    continueWith: (n: number) => (n === 1 ? 'Continuar con 1 club' : `Continuar con ${n} clubes`),
    skip: 'Ahora no',
    alertsTitle: 'Te avisamos cuando algo cambia',
    alertsBody: 'Tres avisos, y ninguno más. Puedes cambiarlos cuando quieras.',
    allow: 'Permitir avisos',
    notNow: 'Ahora no',
    pendingNote:
      'Los avisos se guardan en este dispositivo y empezarán a llegar cuando publiquemos la app.',
  },

  account: {
    title: 'Cuenta',
    notSignedIn: 'Sin cuenta',
    notSignedInBody: 'Tus avisos y calendarios están guardados en este dispositivo.',
    alertTypes: 'Tipos de aviso',
    reminder: '30 minutos antes del partido',
    reminderNote: 'Para cada club que sigues',
    moved: 'Si cambia la hora',
    movedNote: 'Tu calendario se actualiza solo también',
    postponed: 'Aplazado o suspendido',
    postponedNote: 'Poco frecuente, y siempre conviene saberlo',
    goals: 'Goles y resultado final',
    goalsNote: 'Necesita marcador en vivo — todavía no disponible',
    preferences: 'Preferencias',
    language: 'Idioma',
    clock: 'Reloj',
    timezone: 'Zona horaria',
    feeds: 'Calendarios',
    noFeeds: 'Sigue a un club y su calendario aparecerá aquí.',
    replayOnboarding: 'Repetir la introducción',
    turnOffAlerts: 'Desactivar avisos en este dispositivo',
    turnOffAlertsNote:
      'Deja de seguir a todos los clubes en este dispositivo. Los calendarios ya añadidos siguen en tu app de calendario hasta que los borres allí.',
  },

  sheets: {
    calendarTitle: (club: string) => `La temporada del ${club}, en tu calendario`,
    calendarBody:
      'Un feed por club. Los partidos nuevos y los cambios de horario se actualizan solos: no hay que volver a añadir nada.',
    jornadaTitle: (n: number) => `Jornada ${n} en tu calendario`,
    jornadaBody:
      'El feed de una jornada es independiente de seguir a un club. Puedes tener los dos.',
    google: 'Google Calendar',
    apple: 'Apple Calendar',
    download: 'Descargar copia .ics',
    snapshotNote:
      'La copia .ics es una foto fija: no se actualiza nunca. Suscríbete para que los cambios lleguen solos.',
    copyAction: 'COPIAR',
    copied: 'COPIADO',
    close: 'Cerrar',
    alertsPendingNote:
      'Los avisos se guardan en este dispositivo y empezarán a llegar cuando publiquemos la app.',
  },

  today: {
    title: 'Tablero',
    eyebrow: (weekday: string) => weekday.toUpperCase(),
    inProgress: 'En juego',
    // ⚠ Dice "en la última comprobación", nunca "en directo".
    inPlayNote: 'En juego en la última comprobación. No hay marcador en vivo todavía.',
    kickoffIn: 'Empieza en',
    noScore: 'Sin marcador todavía',
    scoreAge: (h: number | null) =>
      h === null
        ? 'No sabemos cuándo se comprobó este marcador · se actualiza cada 4 h aprox.'
        : `Marcador comprobado hace ${h} h · se actualiza cada 4 h aprox.`,
    tbd: 'Hora por confirmar',
    finishedToday: 'Finalizados hoy',
    finished: 'FIN',
    settleNote:
      'Resultados finales de todas las ligas que seguimos. Se confirman unos minutos después del pitido.',
    upcoming: 'Próximos de tus clubes',
    followTitle: 'Sigue a tu club y no te pierdas ningún partido.',
    followBody:
      'La temporada entera entra de una vez. Si cambia un horario, la entrada del calendario cambia contigo y recibes un aviso.',
    browseAll: 'Ver todos',
    quiet: 'Hoy no se ha jugado nada todavía.',
  },

  club: {
    alertsOn: 'Avisos activados',
    alertsOff: 'Avisos de partido',
    calendar: 'Calendario',
    subscribeNote:
      'Una suscripción cubre toda la temporada: cambios de horario, aplazamientos, cambios de campo. No hay opción por partido, y es a propósito.',
    fixtures: 'Partidos',
    players: 'Plantilla',
    noScheduleTitle: 'Todavía no hay calendario completo para este club',
    noScheduleBody:
      'Solo conocemos un puñado de partidos, así que esta lista sería engañosa. Suscríbete y se completará en la próxima sincronización nocturna.',
    squadEmpty: 'La plantilla de este club aún no está publicada.',
    bandLabels: { GK: 'Porteros', DEF: 'Defensas', MID: 'Centrocampistas', FWD: 'Delanteros' },
    roundPrefix: 'J',
    notFound: 'No encontramos este club.',
  },

  clubs: {
    title: 'Clubes',
    search: (n: number) => `Buscar entre ${n} clubes`,
    subscribed: 'Siguiendo',
    browse: (league: string) => `Explorar ${league}`,
    follow: '+ SEGUIR',
    // ⚠ `lastSyncedAt === null`: no presentar como calendario.
    schedulePending: 'Calendario pendiente',
    fullSeason: (n: number) => `${n} partidos`,
    noResults: 'Ningún club coincide con tu búsqueda.',
    error: 'No se han podido cargar los clubes.',
    retry: 'Reintentar',
  },

  matchdays: {
    title: (n: number) => `Jornada ${n}`,
    eyebrow: (league, season, half) =>
      [league, season, half].filter(Boolean).join(' · ').toUpperCase(),
    firstHalf: 'Primera vuelta',
    secondHalf: 'Segunda vuelta',
    midweek: 'Entre semana',
    addAll: (n: number) => `Añadir los ${n} partidos`,
    timesPending:
      'Los horarios de esta jornada aún no están confirmados. Las fechas son provisionales.',
    missing: (n: number) => `Faltan ${n} partidos por publicar`,
    finished: 'FIN',
    empty: 'Esta jornada aún no tiene partidos publicados.',
    error: 'No se ha podido cargar la jornada.',
    retry: 'Reintentar',
  },

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

  alerts: {
    eyebrow: (club: string, matches: number) => `${club} · ${matches} matches`.toUpperCase(),
    title: (club: string) => `Follow ${club} all season`,
    body: 'One subscription. There is no per-match option, by design.',
    bullets: [
      'A reminder 30 minutes before every match',
      'We tell you when a kickoff moves',
      'And when one is postponed or abandoned',
    ],
    confirm: 'Confirm and subscribe',
    unsubscribe: 'Unsubscribe',
    cancel: 'Cancel',
    footnote: 'You can unfollow in one tap from the Clubs tab.',
    unsubscribeTitle: (club: string) => `Unfollow ${club}?`,
    unsubscribeBody:
      'Alerts stop. The calendar you already added stays in your calendar app until you delete it there.',
  },

  onboarding: {
    pickTitle: 'Who do you follow?',
    pickBody:
      'Pick your clubs. Their whole season goes into your calendar, and we tell you when a kickoff moves.',
    search: 'Search for a club',
    continueWith: (n: number) => (n === 1 ? 'Continue with 1 club' : `Continue with ${n} clubs`),
    skip: 'Not now',
    alertsTitle: 'We tell you when something changes',
    alertsBody: 'Three alerts, and no others. You can change them any time.',
    allow: 'Allow notifications',
    notNow: 'Not now',
    pendingNote:
      'Alerts are saved on this device and start arriving once the app is released.',
  },

  account: {
    title: 'Account',
    notSignedIn: 'Not signed in',
    notSignedInBody: 'Your alerts and calendars are saved on this device.',
    alertTypes: 'Alert types',
    reminder: '30 minutes before kickoff',
    reminderNote: 'For every club you follow',
    moved: 'When a kickoff moves',
    movedNote: 'Your calendar updates itself too',
    postponed: 'Postponed or abandoned',
    postponedNote: 'Rare, and always worth knowing',
    goals: 'Goals & final score',
    goalsNote: 'Needs a live feed — not yet available',
    preferences: 'Preferences',
    language: 'Language',
    clock: 'Clock',
    timezone: 'Timezone',
    feeds: 'Calendar feeds',
    noFeeds: 'Follow a club and its calendar appears here.',
    replayOnboarding: 'Replay onboarding',
    turnOffAlerts: 'Turn off alerts on this device',
    turnOffAlertsNote:
      'Unfollows every club on this device. Calendars you already added stay in your calendar app until you delete them there.',
  },

  sheets: {
    calendarTitle: (club: string) => `${club}'s season, in your calendar`,
    calendarBody:
      'One feed per club. New fixtures and moved kickoffs update themselves — nothing to re-add.',
    jornadaTitle: (n: number) => `Matchday ${n} in your calendar`,
    jornadaBody:
      'A matchday feed is separate from following a club. You can have both.',
    google: 'Google Calendar',
    apple: 'Apple Calendar',
    download: 'Download .ics snapshot',
    snapshotNote:
      'The .ics snapshot is a still picture — it never updates. Subscribe and changes arrive on their own.',
    copyAction: 'COPY',
    copied: 'COPIED',
    close: 'Close',
    alertsPendingNote:
      'Alerts are saved on this device and start arriving once the app is released.',
  },

  today: {
    title: 'Board',
    eyebrow: (weekday: string) => weekday.toUpperCase(),
    inProgress: 'In progress',
    inPlayNote: 'In play as of the last check. There is no live score feed yet.',
    kickoffIn: 'Kickoff in',
    noScore: 'No score yet',
    scoreAge: (h: number | null) =>
      h === null
        ? 'Score age unknown · updates roughly every 4h'
        : `Score last checked ${h}h ago · updates roughly every 4h`,
    tbd: 'Kickoff time to be confirmed',
    finishedToday: 'Finished today',
    finished: 'FT',
    settleNote:
      'Full-time scores from every league we track. Settled a few minutes after the whistle.',
    upcoming: 'Upcoming from your clubs',
    followTitle: 'Follow your favourite club and never miss a kickoff.',
    followBody:
      'The whole season goes in at once. When a kickoff moves, the calendar entry moves with it and you get an alert the same minute.',
    browseAll: 'Browse all',
    quiet: 'Nothing has been played yet today.',
  },

  club: {
    alertsOn: 'Alerts on',
    alertsOff: 'Match alerts',
    calendar: 'Calendar',
    subscribeNote:
      'One subscription covers the whole season — kickoff moved, postponed, venue switched. There is no per-match option, by design.',
    fixtures: 'Fixtures',
    players: 'Players',
    noScheduleTitle: 'No full schedule for this club yet',
    noScheduleBody:
      'Only a handful of matches are known, so this would be a misleading list. Subscribe and it fills in on the next nightly sync.',
    squadEmpty: 'No squad published for this club yet.',
    bandLabels: { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' },
    roundPrefix: 'J',
    notFound: 'We could not find this club.',
  },

  clubs: {
    title: 'Clubs',
    search: (n: number) => `Search ${n} clubs`,
    subscribed: 'Subscribed',
    browse: (league: string) => `Browse ${league}`,
    follow: '+ FOLLOW',
    schedulePending: 'Schedule pending',
    fullSeason: (n: number) => `${n} matches`,
    noResults: 'No club matches your search.',
    error: 'Could not load clubs.',
    retry: 'Try again',
  },

  matchdays: {
    title: (n: number) => `Matchday ${n}`,
    eyebrow: (league, season, half) =>
      [league, season, half].filter(Boolean).join(' · ').toUpperCase(),
    firstHalf: 'First half',
    secondHalf: 'Second half',
    midweek: 'Midweek',
    addAll: (n: number) => `Add all ${n} matches`,
    timesPending:
      'Kickoff times for this matchday are not confirmed yet. The dates are provisional.',
    missing: (n: number) => `${n} matches not published yet`,
    finished: 'FT',
    empty: 'No matches published for this matchday yet.',
    error: 'Could not load the matchday.',
    retry: 'Try again',
  },

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
