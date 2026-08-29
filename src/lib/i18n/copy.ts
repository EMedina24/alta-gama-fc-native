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
 * ⚠ Brand strings are NOT localised and NOT edited: **Alta Gama FC**, spaced.
 * `AltaGama FC` is the superseded closed-up spelling — see
 * `.claude/decisions/0042-brand-spelling-spaced-form-reinstated.md`.
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
  reminders: {
    /** ⚠ The lead is IN the banner title. With three leads on, a reader gets
     *  three notifications for one match and this is the only thing that tells
     *  them apart (ADR 0040). */
    title: (home: string, away: string, leadMinutes: number) => string;
    body: (kickoff: string, venue: string | null) => string;
    /** The one notification ACTION button (ADR 0036). iOS truncates hard. */
    openClub: string;
  };
  /**
   * The widgets' own furniture (ADR 0047).
   *
   * ⚠⚠ **These strings TRAVEL — they are written into the App Group snapshot and
   * drawn by a separate binary.** That is the opposite of how the notification
   * content extension gets its labels (two `.lproj` files, trap 15), and the
   * inversion is deliberate: a widget renders in the SYSTEM language, so
   * `.lproj` would hand an English widget to a reader who chose Spanish inside
   * the app. Every string here arrives at the extension already resolved for
   * this reader's `lang`, `tz` and `clock`.
   *
   * ⚠ The consequence is that they are only as fresh as the last snapshot
   * write. A language switch rewrites it in the same effect, so the stale window
   * is one render — but these are a RENDERING, not data.
   */
  widgets: {
    /** Small-widget eyebrow, before the ` · J4`. */
    next: string;
    /** Medium-widget eyebrow. */
    yourWeek: string;
    /** ⚠ Fully formed, count included — the extension only prints it. */
    clubCount: (n: number) => string;
    /** Nothing followed at all. */
    followPrompt: string;
    /** Following clubs, none of them playing inside the window. */
    noFixtures: string;
    /** The separator in `VAL v RMA`. */
    versus: string;
    /** Prefix for an away row: `at Girona`. ⚠ A preposition, not `awayWord`. */
    away: string;
    /**
     * The pill after the FOLLOWED side's name on the medium widget (ADR 0059):
     * `HOME` / `AWAY`. ⚠ Short on purpose — it shares a 13.5pt row with two
     * club names. Not `homeWord`/`awayWord`, which are sentence fragments.
     */
    homeTag: string;
    awayTag: string;
    /** The NEWS widget's eyebrow (ADR 0061). */
    news: string;
    /** The feed is empty, or every story aged past 48h. */
    noHeadlines: string;
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
    /** The three lead rows, nested under the reminder master (ADR 0040).
     *  ⚠ Drawn DIM and non-interactive while the master is off — three live
     *  switches under a dead one is a lie about what will be delivered. */
    leads: Readonly<Record<60 | 30 | 15, string>>;
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
    /** ⚠ Accounts (ADR 0038). Everything below is drawn only when signed in,
     *  except `signIn`, which replaces the identity block when signed out. */
    signIn: string;
    signInBody: string;
    signOut: string;
    /** Fallback heading when the provider gave us no name — Apple, second
     *  sign-in onwards, if the first one was ever missed. */
    someone: string;
    deleteAccount: string;
    /** ⚠ Step two of two. The server has no undo. */
    deleteAccountConfirm: string;
    deleteAccountNote: string;
    deleteAccountFailed: string;
  };
  auth: {
    title: string;
    body: string;
    /** ⚠ Apple's own button draws its own label; this is its accessibility name. */
    apple: string;
    google: string;
    legal: string;
    /** ⚠ Chosen from an `AuthFailure`, never echoed from Supabase (which
     *  writes English prose, in an app that ships in two languages). */
    errorRejected: string;
    errorRateLimited: string;
    errorUnavailable: string;
    errorUnknown: string;
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
    /**
     * ⚠ The SWEEP path's note — the card fed by `/cronogol/fixtures`, whose
     * `live` flag is up to ~3h old. Says "as of the last check" and names the
     * real limit on the live feed. **Never the word "live" about this data.**
     */
    inPlayNote: string;
    /**
     * The minute of play, on the LIVE path only (`GET /cronogol/live`).
     *
     * ⚠ The number ALREADY INCLUDES stoppage time — `94` is "90+4". Print it as
     * given; never compose `90+4`, the source sends no split.
     * ⚠ A PRIME (U+2032), the same mark the events panel uses in `45+3′`, not
     * an apostrophe.
     */
    minute: (n: number) => string;
    /**
     * The live card's note. ⚠ This is the one place in the app that may say a
     * score is current, because `/cronogol/live` re-reads every ~30s and its
     * rows join to our fixtures by id. It states the cadence anyway — the age
     * line is the design's contract, not a workaround for a slow feed.
     */
    liveNote: string;
    /**
     * ⚠ **The failure mode.** Rendered when the backend has in-play rows and
     * nothing refreshing them, or `lastSeenAt` has fallen behind. Null minutes
     * = the stamp could not be read: say the score may be out of date rather
     * than inventing a number for how far.
     */
    liveStalled: (minutesAgo: number | null) => string;
    kickoffIn: string;
    noScore: string;
    /**
     * The score-age line under an in-play score. ⚠ Required wherever a live
     * score appears (SPEC §3.1). Null hours = the feed carries no stamp.
     */
    scoreAge: (hoursAgo: number | null) => string;
    /** The last-result card's eyebrow. */
    lastResult: string;
    /** "MD 3" / "J 3" — the matchday half of the last-result meta. */
    md: (n: number) => string;
    tbd: string;
    finishedToday: string;
    finished: string;
    settleNote: string;
    upcoming: string;
    /** The next card's own meta — a date, not the section name. */
    nextUp: string;
    /** ⚠ Says whose clock the kickoff is in. */
    yourTime: string;
    /** The day word under an upcoming kickoff — rendered as an eyebrow. */
    tonight: string;
    tomorrow: string;
    /**
     * Stands in for a missing venue on an upcoming row — "en casa" / "fuera".
     * ⚠ Reads as a phrase on its own, not the `L`/`V` pill of a fixture list.
     */
    homeWord: string;
    awayWord: string;
    /**
     * The two stat tiles under the upcoming section (SPEC §3.1 item 4).
     *
     * ⚠ **Both counts are the SAME NUMBER today, and that is not a bug.** In an
     * account-less-follow model (ADR 0019/0038) a calendar feed is derived 1:1
     * from a followed club, so "3 clubs" and "3 calendars" are two true
     * statements about one set. The labels are what distinguishes them; the
     * destinations differ (Clubs tab vs the account sheet). They only diverge
     * the day claimed or subset feeds exist.
     */
    tileClubs: string;
    tileFeeds: string;
    followTitle: string;
    followBody: string;
    browseAll: string;
    quiet: string;
  };
  /**
   * The expanded match row: one finished match's timeline (ADR 0045).
   *
   * ⚠ Shared by three surfaces — FINISHED TODAY, the matchday rows and the
   * board's last-result card — so it is top-level rather than living under
   * `today`.
   */
  events: {
    /**
     * The panel's eyebrow. Rendered uppercase by the `eyebrow` variant.
     *
     * ⚠ Only reaches the screen when the panel has NO tabs — the group control
     * labels itself, and the two together printed the same idea twice (ADR
     * 0046). It survives for the pending / error / not-published states, which
     * have nothing to group.
     */
    title: string;
    /**
     * The group tabs (ADR 0046).
     *
     * ⚠ Sentence case — these are NOT eyebrows, and `Type.eventTab` does not
     * uppercase them.
     *
     * ⚠ `other` is `var` + `missed-penalty` + `unknown`, and whatever mark is
     * added next. Keep the label generic: naming it after VAR would mislabel
     * the day something else lands in it.
     */
    groups: { goals: string; cards: string; subs: string; other: string };
    /** ⚠ Only on a goal, and never together with `penalty`. */
    assist: (name: string) => string;
    /** ⚠ The player going OFF. The one coming ON takes the primary line. */
    off: (name: string) => string;
    penalty: string;
    ownGoal: string;
    /** ⚠ A sending-off, not a booking — it draws the RED card. */
    secondYellow: string;
    /**
     * ⚠⚠ `subtype` is an OPEN string on the wire, not a union. An unrecognised
     * key must render the mark with **no detail line** — never the raw slug.
     * Both maps are looked up defensively in `lib/cronogol/events.ts`.
     */
    varLabels: Readonly<Record<string, string>>;
    missedLabels: Readonly<Record<string, string>>;
    /**
     * ⚠⚠ **Never "no goals", and never "0 events".** An empty array means we
     * have not swept the fixture yet — the ingest is finished-only and
     * three-hourly, so a 4-1 that ended twenty minutes ago returns `count: 0`.
     * A 0-0 and an un-swept thriller are the same response and the API cannot
     * tell them apart for us.
     */
    notPublished: string;
    /**
     * ⚠ A FAILED request is not an empty one. Without this branch a dropped
     * connection renders `notPublished` — the app stating, as fact, that the
     * backend holds no events for a match it never managed to ask about.
     */
    error: string;
    expand: string;
    collapse: string;
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
  /**
   * The player sheet.
   *
   * ⚠ `positionNames` is SINGULAR and is NOT `club.bandLabels` — the list groups
   * "Goalkeepers", the sheet describes one "Goalkeeper".
   *
   * ⚠ There is no key for a missing value, deliberately. A null renders an EMPTY
   * cell under its label; `note` is what explains the blank.
   */
  player: {
    done: string;
    age: string;
    nationality: string;
    height: string;
    weight: string;
    foot: string;
    registered: string;
    heightValue: (cm: number) => string;
    weightValue: (kg: number) => string;
    positionNames: Record<'GK' | 'DEF' | 'MID' | 'FWD', string>;
    footValues: Record<'left' | 'right' | 'both', string>;
    notFound: string;
    /** ⚠ Not a disclaimer to trim — see the note in the sheet organism. */
    note: string;
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
    /** The header's range slot while kickoffs are provisional — short, eyebrow-length. */
    datesPending: string;
    /** The eyebrow over the 1…N strip. */
    stripLabel: string;
    /** Accessibility labels for the prev/next squares. */
    previous: string;
    next: string;
    missing: (n: number) => string;
    finished: string;
    /**
     * The caption under an in-play score, in `live`. ⚠ Means "as of the last
     * check" and must never become the word "live" — the fixture sweep is ~3h
     * (ADR 0035). Kept short: it renders uppercase inside `Size.timingColumn`.
     */
    inProgress: string;
    /**
     * ⚠ Required beside the list whenever an in-play score is on screen, and
     * never removed to tidy the screen. States both facts in one sentence: the
     * score is as of the last check, and the check runs roughly every 3h.
     */
    inPlayNote: string;
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
  /**
   * The news card and screen (ADR 0064).
   *
   * ⚠ FURNITURE only. Headlines, publisher names and topics come off the wire
   * verbatim and are never localised — they are quotes. Only these strings
   * follow the reader's language.
   */
  news: {
    /** Section eyebrow on the card AND the pushed screen's title. */
    title: string;
    allNews: string;
    /** `4 NEW` — fully formed, uppercased by the eyebrow token. */
    newCount: (n: number) => string;
    /** The filter chips' first entry. */
    all: string;
    today: string;
    yesterday: string;
    /** Feed empty, or every story aged out. Chips stay visible above it. */
    quiet: string;
    /**
     * The aggregation line at the end of the list. ⚠ Must stay true about
     * BOTH kinds of row — third-party headlines that link out and our own
     * editorial that opens on altagamafc.com. Not a footnote to trim.
     */
    attribution: string;
    /** Link-out sheet. */
    openAt: (publisher: string) => string;
    noteExternal: (publisher: string) => string;
    share: string;
    cancel: string;
    /** The sheet opened on a story the cache no longer holds. */
    gone: string;
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

  reminders: {
    title: (home: string, away: string, leadMinutes: number) =>
      `${home} v ${away} · ${leadMinutes === 60 ? '1 hora' : `${leadMinutes} minutos`}`,
    body: (kickoff: string, venue: string | null) =>
      venue ? `Empieza a las ${kickoff} en ${venue}.` : `Empieza a las ${kickoff}.`,
    openClub: 'Abrir club',
  },

  widgets: {
    next: 'PRÓXIMO',
    yourWeek: 'TU SEMANA',
    // ⚠ `club` is invariable in the singular here — `1 CLUB`, `3 CLUBES`.
    clubCount: (n: number) => (n === 1 ? '1 CLUB' : `${n} CLUBES`),
    followPrompt: 'Sigue a un club',
    noFixtures: 'Sin partidos programados',
    // ⚠ `v`, not `vs`. The kickoff reminder title already uses the bare `v` in
    // both languages; the widget is the same fixture named the same way.
    versus: 'v',
    away: 'en',
    homeTag: 'CASA',
    awayTag: 'FUERA',
    news: 'NOTICIAS',
    noHeadlines: 'Aún no hay titulares',
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
    reminder: 'Antes del partido',
    reminderNote: 'Para cada club que sigues',
    leads: { 60: '1 hora antes', 30: '30 minutos antes', 15: '15 minutos antes' },
    moved: 'Si cambia la hora',
    movedNote: 'Tu calendario se actualiza solo también',
    postponed: 'Aplazado o suspendido',
    postponedNote: 'Poco frecuente, y siempre conviene saberlo',
    goals: 'Goles y resultado final',
    goalsNote: 'Solo LaLiga, por ahora',
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
    signIn: 'Iniciar sesión',
    signInBody: 'Guarda tu cuenta para tenerla en cualquier dispositivo.',
    signOut: 'Cerrar sesión',
    someone: 'Tu cuenta',
    deleteAccount: 'Eliminar cuenta',
    deleteAccountConfirm: 'Eliminar definitivamente',
    deleteAccountNote:
      'No se puede deshacer. Los calendarios que compartiste dejarán de actualizarse y quedarán vacíos, y seguirán en tu app de calendario hasta que los borres allí. Los avisos de este dispositivo siguen activos.',
    deleteAccountFailed: 'No se pudo eliminar la cuenta. Sigue activa — inténtalo de nuevo.',
  },

  auth: {
    title: 'Tu cuenta de Alta Gama FC',
    body: 'Para tener tus clubes y calendarios en cualquier dispositivo. Puedes seguir usando la app sin cuenta.',
    apple: 'Continuar con Apple',
    google: 'Continuar con Google',
    legal: 'Solo guardamos tu nombre y tu correo. Puedes eliminar la cuenta cuando quieras.',
    errorRejected: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    errorRateLimited: 'Demasiados intentos. Espera un momento.',
    errorUnavailable: 'Sin conexión con el servicio de cuentas. Inténtalo en un momento.',
    errorUnknown: 'Algo salió mal. Inténtalo de nuevo.',
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
    // ⚠ La rama del BARRIDO (~3 h). Dice "en la última comprobación", nunca
    // "en directo" — el minuto en directo solo cubre LaLiga.
    inPlayNote: 'En juego en la última comprobación. El minuto en directo solo cubre LaLiga.',
    // ⚠ El número YA INCLUYE el descuento: 94 es "90+4". Nunca componer `90+4`.
    minute: (n: number) => `${n}′`,
    liveNote: 'En directo · se actualiza cada 30 s aprox.',
    liveStalled: (m: number | null) =>
      m === null
        ? 'Actualización en directo detenida · el marcador puede estar desactualizado'
        : `Actualización en directo detenida · marcador comprobado hace ${m} min`,
    kickoffIn: 'Empieza en',
    noScore: 'Sin marcador todavía',
    // ⚠ El barrido de partidos corre cada ~3 h y no lleva sello por partido,
    // así que la rama nula es la que se ve. Nunca "en directo".
    scoreAge: (h: number | null) =>
      h === null
        ? 'Marcador de la última comprobación · se actualiza cada 3 h aprox.'
        : `Marcador comprobado hace ${h} h · se actualiza cada 3 h aprox.`,
    lastResult: 'Último resultado',
    md: (n: number) => `J ${n}`,
    tbd: 'Hora por confirmar',
    finishedToday: 'Finalizados hoy',
    finished: 'FIN',
    settleNote:
      'Resultados finales de todas las ligas que seguimos. Se confirman unos minutos después del pitido.',
    upcoming: 'Próximos de tus clubes',
    nextUp: 'Siguiente partido',
    yourTime: 'tu hora',
    tonight: 'Hoy',
    tomorrow: 'Mañana',
    homeWord: 'en casa',
    awayWord: 'a domicilio',
    tileClubs: 'Clubes',
    tileFeeds: 'Calendarios',
    followTitle: 'Sigue a tu club y no te pierdas ningún partido.',
    followBody:
      'La temporada entera entra de una vez. Si cambia un horario, la entrada del calendario cambia contigo y recibes un aviso.',
    browseAll: 'Ver todos',
    quiet: 'Hoy no se ha jugado nada todavía.',
  },

  events: {
    title: 'Sucesos del partido',
    groups: { goals: 'Goles', cards: 'Tarjetas', subs: 'Cambios', other: 'Otros' },
    assist: (name: string) => `Asistencia · ${name}`,
    off: (name: string) => `Sale · ${name}`,
    penalty: 'Penalti',
    ownGoal: 'En propia puerta',
    secondYellow: 'Doble amarilla',
    varLabels: {
      'goal-awarded': 'Gol concedido',
      'goal-not-awarded': 'Gol anulado',
      'penalty-awarded': 'Penalti concedido',
      'penalty-not-awarded': 'Penalti denegado',
      'card-upgrade': 'Tarjeta agravada',
    },
    missedLabels: {
      saved: 'Penalti parado',
      missed: 'Penalti fallado',
      post: 'Al palo',
    },
    // ⚠ "Todavía no están publicados", nunca "sin goles": una goleada que acabó
    // hace veinte minutos devuelve exactamente esta misma respuesta.
    notPublished: 'Los sucesos de este partido todavía no están publicados.',
    error: 'No se han podido cargar los sucesos.',
    expand: 'Ver los sucesos del partido',
    collapse: 'Ocultar los sucesos del partido',
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

  player: {
    done: 'Listo',
    age: 'Edad',
    nationality: 'Nacionalidad',
    height: 'Altura',
    weight: 'Peso',
    foot: 'Pie',
    registered: 'Inscrito',
    heightValue: (cm: number) => `${(cm / 100).toFixed(2)} m`,
    weightValue: (kg: number) => `${kg} kg`,
    positionNames: { GK: 'Portero', DEF: 'Defensa', MID: 'Centrocampista', FWD: 'Delantero' },
    footValues: { left: 'Izquierdo', right: 'Derecho', both: 'Ambos' },
    notFound: 'No encontramos a este jugador.',
    note: 'De la plantilla inscrita en la liga, sincronizada cada semana. Las casillas vacías son datos que la liga no publica: en esta ruta no hay partidos jugados ni goles.',
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
    datesPending: 'Fechas por confirmar',
    stripLabel: 'Jornada',
    previous: 'Jornada anterior',
    next: 'Jornada siguiente',
    missing: (n: number) => `Faltan ${n} partidos por publicar`,
    finished: 'FIN',
    // ⚠ Dice "en juego", nunca "en directo": el barrido corre cada ~3 h.
    inProgress: 'En juego',
    inPlayNote:
      'En juego en la última comprobación. Se actualiza cada ~3 h; el minuto en directo solo cubre LaLiga y no se muestra aquí.',
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
  news: {
    title: 'Noticias',
    allNews: 'Todas las noticias',
    newCount: (n: number) => `${n} ${n === 1 ? 'nueva' : 'nuevas'}`,
    all: 'Todas',
    today: 'Hoy',
    yesterday: 'Ayer',
    quiet: 'Sin noticias por ahora. Vuelve dentro de un rato.',
    attribution:
      'Los titulares de medios externos se recogen aquí y se abren en el artículo original; Alta Gama FC no aloja ni edita esa información. Nuestras propias piezas se abren en altagamafc.com.',
    openAt: (publisher: string) => `Abrir en ${publisher}`,
    noteExternal: (publisher: string) =>
      `Se abre en ${publisher}, en tu navegador. La información es suya; la app solo ha recogido el titular.`,
    share: 'Compartir',
    cancel: 'Cancelar',
    gone: 'Esta noticia ya no está disponible.',
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

  reminders: {
    title: (home: string, away: string, leadMinutes: number) =>
      `${home} v ${away} · ${leadMinutes === 60 ? '1 hour' : `${leadMinutes} minutes`}`,
    body: (kickoff: string, venue: string | null) =>
      venue ? `Kicks off ${kickoff} at ${venue}.` : `Kicks off ${kickoff}.`,
    openClub: 'Open club',
  },

  widgets: {
    next: 'NEXT',
    yourWeek: 'YOUR WEEK',
    clubCount: (n: number) => (n === 1 ? '1 CLUB' : `${n} CLUBS`),
    followPrompt: 'Follow a club',
    noFixtures: 'No matches scheduled',
    versus: 'v',
    away: 'at',
    homeTag: 'HOME',
    awayTag: 'AWAY',
    news: 'NEWS',
    noHeadlines: 'No headlines yet',
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
    reminder: 'Before kickoff',
    reminderNote: 'For every club you follow',
    leads: { 60: '1 hour before', 30: '30 minutes before', 15: '15 minutes before' },
    moved: 'When a kickoff moves',
    movedNote: 'Your calendar updates itself too',
    postponed: 'Postponed or abandoned',
    postponedNote: 'Rare, and always worth knowing',
    goals: 'Goals & final score',
    goalsNote: 'LaLiga only, for now',
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
    signIn: 'Sign in',
    signInBody: 'Keep your account on every device.',
    signOut: 'Sign out',
    someone: 'Your account',
    deleteAccount: 'Delete account',
    deleteAccountConfirm: 'Delete permanently',
    deleteAccountNote:
      'This cannot be undone. Calendars you shared stop updating and go empty, and stay in your calendar app until you delete them there. Alerts on this device keep working.',
    deleteAccountFailed: 'Could not delete your account. It is still active — try again.',
  },

  auth: {
    title: 'Your Alta Gama FC account',
    body: 'Keeps your clubs and calendars on every device. The app works fine without one.',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    legal: 'We store your name and email, nothing else. You can delete your account at any time.',
    errorRejected: 'Could not sign you in. Try again.',
    errorRateLimited: 'Too many attempts. Wait a moment.',
    errorUnavailable: 'Could not reach the account service. Try again shortly.',
    errorUnknown: 'Something went wrong. Try again.',
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
    // ⚠ The SWEEP branch (~3h). Names the real limit rather than claiming no
    // live feed exists — one does, and it covers LaLiga only.
    inPlayNote: 'In play as of the last check. Live minutes cover LaLiga only.',
    // ⚠ The number ALREADY INCLUDES stoppage: 94 is "90+4". Never compose one.
    minute: (n: number) => `${n}′`,
    liveNote: 'Live · refreshed about every 30s.',
    liveStalled: (m: number | null) =>
      m === null
        ? 'Live updates paused · this score may be out of date'
        : `Live updates paused · score last checked ${m} min ago`,
    kickoffIn: 'Kickoff in',
    noScore: 'No score yet',
    // ⚠ The fixture sweep runs every ~3h and carries no per-row stamp, so the
    // null branch is the one that renders. States the cadence, never a minute.
    scoreAge: (h: number | null) =>
      h === null
        ? 'Score as of the last check · updates roughly every 3h'
        : `Score last checked ${h}h ago · updates roughly every 3h`,
    lastResult: 'Last result',
    md: (n: number) => `MD ${n}`,
    tbd: 'Kickoff time to be confirmed',
    finishedToday: 'Finished today',
    finished: 'FT',
    settleNote:
      'Full-time scores from every league we track. Settled a few minutes after the whistle.',
    upcoming: 'Upcoming from your clubs',
    nextUp: 'Next up',
    yourTime: 'your time',
    tonight: 'Tonight',
    tomorrow: 'Tomorrow',
    homeWord: 'at home',
    awayWord: 'away',
    tileClubs: 'Clubs',
    tileFeeds: 'Calendars',
    followTitle: 'Follow your favourite club and never miss a kickoff.',
    followBody:
      'The whole season goes in at once. When a kickoff moves, the calendar entry moves with it and you get an alert the same minute.',
    browseAll: 'Browse all',
    quiet: 'Nothing has been played yet today.',
  },

  events: {
    title: 'Match events',
    groups: { goals: 'Goals', cards: 'Cards', subs: 'Subs', other: 'Other' },
    assist: (name: string) => `Assist · ${name}`,
    off: (name: string) => `Off · ${name}`,
    penalty: 'Penalty',
    ownGoal: 'Own goal',
    secondYellow: 'Second yellow',
    varLabels: {
      'goal-awarded': 'Goal awarded',
      'goal-not-awarded': 'Goal disallowed',
      'penalty-awarded': 'Penalty awarded',
      'penalty-not-awarded': 'Penalty not awarded',
      'card-upgrade': 'Card upgraded',
    },
    missedLabels: {
      saved: 'Penalty saved',
      missed: 'Penalty missed',
      post: 'Off the post',
    },
    // ⚠ "Not published yet", never "no goals": a thrashing that ended twenty
    // minutes ago returns exactly this same response.
    notPublished: "This match's events aren't published yet.",
    error: "Couldn't load the events.",
    expand: 'Show match events',
    collapse: 'Hide match events',
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

  player: {
    done: 'Done',
    age: 'Age',
    nationality: 'Nationality',
    height: 'Height',
    weight: 'Weight',
    foot: 'Foot',
    registered: 'Registered',
    heightValue: (cm: number) => `${(cm / 100).toFixed(2)} m`,
    weightValue: (kg: number) => `${kg} kg`,
    positionNames: { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' },
    footValues: { left: 'Left', right: 'Right', both: 'Both' },
    notFound: 'We could not find this player.',
    note: "From the league's registered squad, synced weekly. Blank cells are fields the league does not publish — no appearance or goal data is available on this route.",
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
    datesPending: 'Dates to be confirmed',
    stripLabel: 'Matchday',
    previous: 'Previous matchday',
    next: 'Next matchday',
    missing: (n: number) => `${n} matches not published yet`,
    finished: 'FT',
    // ⚠ "In play", never "live" — and shorter than the board's "In progress",
    // which does not fit the timing column at eyebrow tracking.
    inProgress: 'In play',
    inPlayNote:
      'In play as of the last check. Updates roughly every 3h — live minutes cover LaLiga only and are not shown here.',
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
  news: {
    title: 'News',
    allNews: 'All news',
    newCount: (n: number) => `${n} new`,
    all: 'All',
    today: 'Today',
    yesterday: 'Yesterday',
    quiet: 'Nothing new right now. Check back in a while.',
    attribution:
      'Headlines from third-party publishers are collected here and open at the original article; Alta Gama FC does not host or edit that reporting. Our own pieces open on altagamafc.com.',
    openAt: (publisher: string) => `Open at ${publisher}`,
    noteExternal: (publisher: string) =>
      `Opens at ${publisher} in your browser. The reporting is theirs; the app only collected the headline.`,
    share: 'Share',
    cancel: 'Cancel',
    gone: 'This story is no longer available.',
  },
};

export const COPY = { es: esCopy, en: enCopy } as const;
