import SwiftUI

/// The long-look match card — design `1b` in `handoff_notifications/`.
///
/// Three variants off one payload. The short look underneath is the standard
/// notification with the composed crest attachment (`1a`); this only ever
/// appears on long-press, so it must never be the only place a fact is stated.
///
/// ⚠ **No card background.** iOS draws the notification's material and rounded
/// corners around this view — painting our own gives a second card inside the
/// first. Only what is INSIDE the notification is ours.
///
/// ⚠ Strings are localised through `Localizable.strings` in this target, not
/// through `copy.ts`. See `Tokens.swift` for why there is no way around that.
struct MatchCard: View {
  let payload: Payload

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      eyebrow
      switch payload.kind {
      case .reminder: reminder
      case .moved: moved
      case .postponed: postponed
      case .goal, .redCard, .fullTime: live
      }
    }
    .padding(.vertical, 14)
  }

  // MARK: - Header

  /// Who sent this, and what kind of alert it is.
  ///
  /// ⚠ **The card must name the app itself.**
  /// `UNNotificationExtensionDefaultContentHidden` suppresses iOS's own header
  /// along with the title and body, so without this row nothing on an expanded
  /// notification says where it came from.
  ///
  /// ⚠ **`AltaGama FC`, one word.** The design mock writes "Alta Gama FC" three
  /// times and that form is RETIRED (AGENTS.md). `Text(verbatim:)` because a
  /// brand name is never localised and must never be picked up for translation.
  ///
  /// ⚠ The icon the mock puts left of the name is deliberately NOT drawn: the
  /// shipping mark is green-on-transparent, while the mock's `radius 4.5` implies
  /// a filled tile, and embedding it would generate an `Assets.xcassets` into
  /// `targets/`. The wordmark alone answers "which app is this".
  private var eyebrow: some View {
    HStack(spacing: 6) {
      Text(verbatim: "ALTAGAMA FC")
        .font(.system(size: 12, weight: .medium))
        .tracking(0.12) // .01em at 12pt
        .foregroundStyle(Tok.ink62)
      Spacer(minLength: 8)
      Text(eyebrowText)
        .font(Tok.micro(9.5))
        .tracking(1.33) // .14em at 9.5pt
        .foregroundStyle(eyebrowTint)
    }
    .padding(.horizontal, 18)
  }

  /// ⚠⚠ **One key PER LEAD, not a formatted number** (ADR 0040). These are
  /// micro-labels at 9.5pt with .14em tracking, where width is the real limit and
  /// each language sets its own — Spanish is deliberately shorter than English —
  /// so an interpolated `String(format:)` would take that choice away from the
  /// translator. ⚠ A lead added to `REMINDER_LEAD_OPTIONS` needs a case here AND
  /// a line in both `.lproj` files, or iOS prints the raw key on the card.
  ///
  /// ⚠ The 60 case names its unit and the other two do not. Deliberate:
  /// `KICKOFF IN 60` reads as a minute count nobody thinks in.
  private var eyebrowText: String {
    switch payload.kind {
    case .reminder:
      switch payload.leadMinutes {
      case 60: String(localized: "KICKOFF IN 1 HOUR")
      case 15: String(localized: "KICKOFF IN 15")
      // ⚠ `default`, not `case 30`: an unrecognised lead — a payload from a build
      // that offered one this binary does not know — still gets a card rather
      // than a compile error the extension cannot report at runtime.
      default: String(localized: "KICKOFF IN 30")
      }
    case .moved: String(localized: "KICKOFF MOVED")
    case .postponed: String(localized: "POSTPONED")
    case .goal: String(localized: "GOAL")
    case .redCard: String(localized: "RED CARD")
    case .fullTime: String(localized: "FULL TIME")
    }
  }

  private var eyebrowTint: Color {
    switch payload.kind {
    case .reminder: Tok.accent
    case .moved: Tok.moved
    case .postponed: Tok.postponed
    case .goal: Tok.accent
    case .redCard: Tok.cardRed
    // ⚠ Muted, not accent. Full time is a result, not a moment — tinting it
    // like a goal would make the least urgent alert the loudest thing on the
    // lock screen.
    case .fullTime: Tok.ink62
    }
  }

  // MARK: - Kickoff reminder

  private var reminder: some View {
    VStack(spacing: 0) {
      HStack(alignment: .top, spacing: 14) {
        club(slot: "home", name: payload.homeName, abbr: payload.homeAbbr)

        VStack(spacing: 5) {
          Text(payload.kickoffLabel ?? payload.time(payload.kickoffUtc))
            .font(Tok.numerals(26, .bold))
            .tracking(-0.78)
            .foregroundStyle(Tok.ink)
          Text(dayLabel)
            .font(Tok.micro(8.5))
            .tracking(1.19)
            .foregroundStyle(Tok.ink50)
        }
        .fixedSize()

        club(slot: "away", name: payload.awayName, abbr: payload.awayAbbr)
      }
      .padding(.horizontal, 18)
      .padding(.top, 16)

      if let context = payload.context {
        Text(context)
          .font(.system(size: 12.5))
          .foregroundStyle(Tok.ink60)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 18)
          .padding(.top, 10)
      }
    }
  }

  /// ⚠ **Derived from the kickoff, never assumed.**
  /// A reminder fires 30 minutes before kickoff, so `TODAY` is *usually* right —
  /// but a kickoff just past local midnight fires the evening before, and a
  /// hardcoded `TODAY` then names the wrong day. Verified wrong on device
  /// 2026-08-26: a card for an Aug-27 kickoff read `TODAY` on Aug 26.
  private var dayLabel: String {
    guard let kickoff = payload.kickoffUtc else { return String(localized: "TODAY") }
    let calendar = Calendar.current
    if calendar.isDateInToday(kickoff) { return String(localized: "TODAY") }
    if calendar.isDateInTomorrow(kickoff) { return String(localized: "TOMORROW") }

    let formatter = DateFormatter()
    formatter.locale = .current
    formatter.timeZone = .current
    formatter.setLocalizedDateFormatFromTemplate("EEE")
    return formatter.string(from: kickoff).uppercased(with: .current)
  }

  private func club(slot: String, name: String, abbr: String) -> some View {
    VStack(spacing: 9) {
      CrestView(fixtureId: payload.fixtureId, slot: slot, abbr: abbr, size: 44)
      Text(name)
        .font(.system(size: 12.5, weight: .semibold))
        .tracking(-0.125) // -.01em at 12.5pt
        .foregroundStyle(Tok.ink)
        .multilineTextAlignment(.center)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Kickoff moved

  private var moved: some View {
    VStack(spacing: 0) {
      fixtureRow

      HStack(alignment: .bottom, spacing: 12) {
        stamp(
          label: String(localized: "WAS"),
          time: payload.time(payload.oldKickoffUtc),
          tint: Tok.ink45,
          ink: Tok.ink42,
          weight: .semibold,
          struck: true
        )

        // ⚠ The arrow carries the direction of the change and is the reason this
        // reads as a change at all. A bare pair of times does not.
        Image(systemName: "arrow.right")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(Tok.moved)
          .padding(.bottom, 2)

        stamp(
          label: String(localized: "NOW"),
          time: payload.time(payload.newKickoffUtc),
          tint: Tok.moved,
          ink: Tok.ink,
          weight: .bold,
          struck: false
        )

        Spacer(minLength: 8)

        Text(String(localized: "Calendar entry moved for you"))
          .font(.system(size: 11.5))
          .foregroundStyle(Tok.ink55)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 118, alignment: .trailing)
      }
      .padding(.horizontal, 18)
      .padding(.top, 14)
    }
  }

  private func stamp(
    label: String,
    time: String,
    tint: Color,
    ink: Color,
    weight: Font.Weight,
    struck: Bool
  ) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      Text(label)
        .font(Tok.micro(8.5))
        .tracking(1.19)
        .foregroundStyle(tint)
      Text(time)
        .font(Tok.numerals(19, weight))
        .tracking(-0.38)
        .foregroundStyle(ink)
        .strikethrough(struck, color: ink)
    }
  }

  // MARK: - Postponed

  private var postponed: some View {
    VStack(spacing: 0) {
      fixtureRow

      HStack(spacing: 10) {
        Text(payload.time(payload.kickoffUtc))
          .font(Tok.numerals(19, .bold))
          .tracking(-0.38)
          .foregroundStyle(Tok.ink42)
          .strikethrough(true, color: Tok.ink42)

        Text(String(localized: "NO NEW DATE"))
          .font(Tok.micro(9))
          .tracking(1.17)
          .foregroundStyle(Tok.postponed)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(
            RoundedRectangle(cornerRadius: 9, style: .continuous)
              .fill(Tok.postponedWash)
              .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                  .strokeBorder(Tok.postponedRing, lineWidth: 0.5)
              )
          )

        Spacer(minLength: 8)

        Text(String(localized: "Removed from your calendar"))
          .font(.system(size: 11.5))
          .foregroundStyle(Tok.ink55)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 120, alignment: .trailing)
      }
      .padding(.horizontal, 18)
      .padding(.top, 14)
    }
  }

  // MARK: - Live match (ADR 0053)

  /// The live alert card: the fixture, the score, and the meta row.
  ///
  /// ⚠ The crests come back here even though the ATTACHMENT is crest-free —
  /// they are two different surfaces. The banner's 38pt plate carries a glyph
  /// because there is no room for more; the expanded card has the width, and
  /// `CrestView` already falls back to a lettered tile on its own.
  private var live: some View {
    VStack(spacing: 0) {
      fixtureRow

      if let scoreline = payload.scoreline {
        Text(scoreline)
          .font(Tok.numerals(30, .bold))
          .tracking(-0.9)
          .foregroundStyle(Tok.ink)
          .padding(.top, 12)
      }

      metaRow
    }
  }

  /// `28' left · 🟨 3 · 🟥 1 · Getafe 10 men`
  ///
  /// ⚠⚠ **Order is FIXED: time left → yellows → reds → consequence.** A row whose
  /// segments move around between two notifications cannot be read at a glance,
  /// which is the only way this row is ever read.
  ///
  /// ⚠ **A zero-value segment is DROPPED, with its divider.** `🟨 0` is noise.
  /// And if only the clock would remain, the whole row goes — a lone `28' left`
  /// under a scoreline is a widow, not information.
  @ViewBuilder
  private var metaRow: some View {
    let segments = metaSegments
    // ⚠ `> 1`, not `> 0`. See the docblock: the clock alone is not a row.
    if segments.count > 1 {
      HStack(spacing: 10) {
        ForEach(Array(segments.enumerated()), id: \.offset) { index, segment in
          if index > 0 {
            Rectangle()
              .fill(Tok.tileRing)
              .frame(width: 1, height: 10)
          }
          Text(segment.text)
            .font(.system(size: 11, weight: .semibold))
            .monospacedDigit()
            .foregroundStyle(segment.tint)
        }
      }
      .padding(.horizontal, 18)
      .padding(.top, 13)
    }
  }

  private struct MetaSegment {
    let text: String
    let tint: Color
  }

  /// ⚠ Built as a LIST, then joined — never a template with holes. That is what
  /// makes "drop the segment and its divider" fall out for free rather than
  /// being three special cases that each have to remember the divider.
  private var metaSegments: [MetaSegment] {
    var segments: [MetaSegment] = []

    // ⚠ Never shown on full time: "28' left" beside a final score is a lie, and
    // the server omits `minutesLeft` there anyway. Belt and braces.
    if payload.kind != .fullTime, let left = payload.minutesLeft {
      segments.append(
        MetaSegment(
          text: String(
            format: String(localized: "%d’ left"),
            left
          ),
          tint: Tok.ink62
        )
      )
    }

    if let yellow = payload.yellowCards, yellow > 0 {
      segments.append(MetaSegment(text: "🟨 \(yellow)", tint: Tok.ink62))
    }
    if let red = payload.redCards, red > 0 {
      segments.append(MetaSegment(text: "🟥 \(red)", tint: Tok.ink62))
    }

    // ⚠ The ONE consequence phrase this row carries, and only after a red. It
    // names the CLUB, never an abbreviation — `GET 10 men` reads as a typo.
    if let short = payload.shortHanded {
      segments.append(
        MetaSegment(
          text: String(
            format: short.nine
              ? String(localized: "%@ 9 men")
              : String(localized: "%@ 10 men"),
            short.club
          ),
          tint: Tok.redInk
        )
      )
    }

    return segments
  }

  // MARK: - Shared

  /// crest · fixture name · crest — the header both change alerts share.
  private var fixtureRow: some View {
    HStack(spacing: 12) {
      CrestView(fixtureId: payload.fixtureId, slot: "home", abbr: payload.homeAbbr, size: 34)
      Text("\(payload.homeName) v \(payload.awayName)")
        .font(.system(size: 14.5, weight: .semibold))
        .tracking(-0.218) // -.015em at 14.5pt
        .foregroundStyle(Tok.ink)
        .lineLimit(2)
        .frame(maxWidth: .infinity, alignment: .leading)
      CrestView(fixtureId: payload.fixtureId, slot: "away", abbr: payload.awayAbbr, size: 34)
    }
    .padding(.horizontal, 18)
    .padding(.top, 15)
  }
}
