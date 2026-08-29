import Foundation

/// The countdown, and the instants the timeline is cut at.
///
/// ⚠⚠ **TIMELINE ENTRIES ARE NOT REFRESHES, and confusing the two is the whole
/// trap this file exists to avoid.** ADR 0025 step 5 says `.after(nextKickoff)`
/// plus midnight and **never a per-minute refresh** — that is a rule about how
/// often WidgetKit is asked to RELOAD the provider, which is a budgeted, rationed
/// thing. Entries handed back inside a single timeline are free: iOS renders them
/// itself, on time, without waking this extension at all. So the countdown can
/// tick at minute resolution in its last hour while the widget still reloads at
/// most once per kickoff.
enum Cadence {
  /// `1d 04h` · `4h 22m` · `18m` — the design's countdown (SPEC §4).
  ///
  /// ⚠ Tabular by construction: the hour and minute halves are zero-padded so
  /// the string keeps its width as the digits change. `Tok.numerals` pins the
  /// font; this pins the shape.
  static func countdown(from now: Date, to kickoff: Date) -> String {
    let remaining = max(0, Int(kickoff.timeIntervalSince(now)))
    let days = remaining / 86_400
    let hours = (remaining % 86_400) / 3_600
    let minutes = (remaining % 3_600) / 60

    if days > 0 { return "\(days)d \(pad(hours))h" }
    if hours > 0 { return "\(hours)h \(pad(minutes))m" }
    return "\(minutes)m"
  }

  private static func pad(_ value: Int) -> String { value < 10 ? "0\(value)" : "\(value)" }

  /// How close to kickoff the SMALL widget swaps `countdown(from:to:)` for a
  /// live, system-ticked `Text(timerInterval:)` (ADR 0058).
  ///
  /// ⚠ 12 hours, because the system's timer format has no days unit — hours
  /// accumulate — so past a day out it renders `38:14:23` where the design says
  /// `1d 14h`. Tried at `.infinity` first and a fixture days out read
  /// `288:14:23` on the simulator, which is what settled it. Inside 12h the
  /// figure is `9:34:12`, ticking every second at zero reload cost.
  static let liveTickWithin: TimeInterval = 12 * 3_600

  /// `1d` · `4h` · `18m` — the Lock Screen's circular accessory, where there is
  /// room for two glyphs and no more.
  static func compact(from now: Date, to kickoff: Date) -> String {
    let remaining = max(0, Int(kickoff.timeIntervalSince(now)))
    if remaining >= 86_400 { return "\(remaining / 86_400)d" }
    if remaining >= 3_600 { return "\(remaining / 3_600)h" }
    return "\(remaining / 60)m"
  }

  /// Every instant the widget should be redrawn at, soonest first.
  ///
  /// Three cadences, coarsest last:
  /// - **every minute in the final hour** before the soonest kickoff, so the
  ///   `18m` form is honest rather than up to an hour stale;
  /// - **every hour** before that, which is all the `1d 04h` form can show;
  /// - **each kickoff**, so a finished match drops out of the list, and **each
  ///   local midnight** for three days, so a widget that never gets another
  ///   reload still ages correctly.
  ///
  /// ⚠ Capped, and the cap is why the minute entries come first: if the list has
  /// to be trimmed, it is the far future that gets coarser, never the next hour.
  static func entryDates(
    from now: Date,
    kickoffs: [Date],
    calendar: Calendar = .current,
    limit: Int = 120
  ) -> [Date] {
    var dates: Set<Date> = [now]

    if let soonest = kickoffs.min() {
      // Minutes, for the last hour.
      var cursor = max(now, soonest.addingTimeInterval(-3_600))
      cursor = ceilTo(cursor, unit: 60)
      while cursor < soonest {
        dates.insert(cursor)
        cursor.addTimeInterval(60)
      }

      // Hours, for everything before that.
      var hour = ceilTo(now, unit: 3_600)
      let stopHours = soonest.addingTimeInterval(-3_600)
      while hour < stopHours, dates.count < limit {
        dates.insert(hour)
        hour.addTimeInterval(3_600)
      }
    }

    for kickoff in kickoffs where kickoff > now { dates.insert(kickoff) }

    // ⚠ LOCAL midnight, from `Calendar`, never `now + 86_400`. A DST boundary
    // makes one of those days 23 or 25 hours long, and a widget that redraws an
    // hour early on the last Sunday in October shows "TOMORROW" all evening.
    var midnight = calendar.startOfDay(for: now)
    for _ in 0..<3 {
      guard let next = calendar.date(byAdding: .day, value: 1, to: midnight) else { break }
      midnight = next
      dates.insert(midnight)
    }

    return dates.filter { $0 >= now }.sorted().prefix(limit).map { $0 }
  }

  /// When to ask for the next reload.
  ///
  /// ⚠ `.after(nextKickoff)` is the rule (ADR 0025): the moment a match starts,
  /// what the widget should say changes and only the app knows the new answer.
  /// With nothing scheduled, the next local midnight — the widget still has to
  /// re-evaluate "today" once a day even when there is nothing to count down to.
  static func reloadAfter(
    now: Date,
    kickoffs: [Date],
    calendar: Calendar = .current
  ) -> Date {
    if let next = kickoffs.filter({ $0 > now }).min() { return next }
    return calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))
      ?? now.addingTimeInterval(3_600)
  }

  private static func ceilTo(_ date: Date, unit: TimeInterval) -> Date {
    let seconds = date.timeIntervalSince1970
    return Date(timeIntervalSince1970: (seconds / unit).rounded(.up) * unit)
  }
}
