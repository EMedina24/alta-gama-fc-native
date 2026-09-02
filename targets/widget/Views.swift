import SwiftUI
import WidgetKit

/// Pieces both widgets draw.
enum W {
  /// The uppercase, heavily tracked micro label the design uses everywhere.
  static func eyebrow(_ text: String, color: Color = Tok.accent, size: CGFloat = 11) -> some View {
    Text(text)
      .font(Tok.micro(size))
      .tracking(1.2)
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.8)
  }

  /// `VAL v RMA`, in the fixture's own order — never the followed club first.
  ///
  /// ⚠ Home side on the left, always. Flipping it so "your" club leads would
  /// make the same match read two ways for two readers, and the pair crest
  /// beside it is composed home-then-away by the backend regardless.
  static func pairLabel(_ row: WidgetSnapshot.Entry, copy: WidgetSnapshot.Copy) -> String {
    "\(row.homeAbbr) \(copy.versus) \(row.awayAbbr)"
  }

  /// Deep link into the club page — the same shape the reminders use, so one
  /// handler in `src/features/push/routing.ts` serves both.
  static func url(_ row: WidgetSnapshot.Entry) -> URL? {
    URL(string: "altagamafc://club/\(row.clubSlug)")
  }
}

/// The two crests of one fixture, with the design's `v` between them.
struct CrestPair: View {
  let row: WidgetSnapshot.Entry
  let copy: WidgetSnapshot.Copy
  var size: CGFloat = 30

  var body: some View {
    HStack(spacing: 8) {
      CrestView(fixtureId: row.fixtureId, slot: "home", abbr: row.homeAbbr, size: size, tone: .open)
      Text(copy.versus)
        .font(Tok.micro(size * 0.34))
        .foregroundStyle(Tok.ink45)
      CrestView(fixtureId: row.fixtureId, slot: "away", abbr: row.awayAbbr, size: size, tone: .open)
    }
  }
}

/// Nothing to count down to, said honestly.
///
/// ⚠ Two different sentences, because they are two different situations and the
/// fix for each is different: follow a club, or wait for the fixtures to be
/// published. Collapsing them into one "Nothing here" is how a reader concludes
/// the widget is broken.
struct EmptyState: View {
  let copy: WidgetSnapshot.Copy
  let followsNothing: Bool
  var alignment: HorizontalAlignment = .leading

  var body: some View {
    VStack(alignment: alignment, spacing: 6) {
      Mark(size: 18)
      Text(followsNothing ? copy.followPrompt : copy.noFixtures)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Tok.ink62)
        .multilineTextAlignment(alignment == .center ? .center : .leading)
        .lineLimit(3)
        .minimumScaleFactor(0.85)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment == .center ? .center : .topLeading)
  }
}
