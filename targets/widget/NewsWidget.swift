import SwiftUI
import WidgetKit

/// **NEWS** — lead story with its picture, then three headlines (design 1a).
///
/// ⚠ Large only. The layout's whole argument is the lead image; at medium the
/// picture has to go and the tile becomes a taller Your Week, which is a
/// different widget the reader already has.
struct NewsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "News", provider: NewsProvider()) { entry in
      NewsView(entry: entry)
        .containerBackground(for: .widget) { MeshPlate() }
    }
    .configurationDisplayName("News")
    .description("Headlines from around the clubs you follow.")
    .supportedFamilies([.systemLarge])
    // ⚠ So the mesh runs flush rather than floating in a black frame (ADR 0086
    // §3). Safe to disable configuration-wide here, unlike on NEXT: this widget
    // is `systemLarge` only and has no accessory family to strip margins from.
    // Content supplies its own 13, matching the other two tiles.
    .contentMarginsDisabled()
  }
}

struct NewsEntry: TimelineEntry {
  let date: Date
  let copy: NewsSnapshot.Copy
  let items: [NewsSnapshot.Item]
  let followsNothing: Bool
}

struct NewsProvider: TimelineProvider {
  func placeholder(in context: Context) -> NewsEntry { entry(at: Date()) }

  func getSnapshot(in context: Context, completion: @escaping (NewsEntry) -> Void) {
    completion(entry(at: Date()))
  }

  /// ⚠ Hourly entries, ONE reload policy. The age label is the only thing that
  /// changes between refreshes, so the timeline pre-renders the next twelve
  /// hours rather than asking for twelve reloads — the same rationing
  /// `Cadence` applies to fixtures (ADR 0025).
  func getTimeline(in context: Context, completion: @escaping (Timeline<NewsEntry>) -> Void) {
    let now = Date()
    let dates = (0..<12).compactMap { Calendar.current.date(byAdding: .hour, value: $0, to: now) }
    completion(Timeline(entries: dates.map { entry(at: $0) }, policy: .after(now.addingTimeInterval(3600))))
  }

  private func entry(at date: Date) -> NewsEntry {
    let snapshot = NewsSnapshot.load() ?? .unavailable(relativeTo: date)
    let followed = WidgetSnapshot.load()?.followsNothing ?? true
    return NewsEntry(date: date, copy: snapshot.copy, items: snapshot.fresh(at: date), followsNothing: followed)
  }
}

struct NewsView: View {
  let entry: NewsEntry

  private var lead: NewsSnapshot.Item? { entry.items.first }
  private var rest: [NewsSnapshot.Item] { Array(entry.items.dropFirst()) }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if let lead {
        LeadStory(item: lead, now: entry.date)
        // ⚠ Rows CENTRE in the space the lead leaves, as on the medium widget:
        // a feed that returned two stories must not look like one that failed
        // to finish loading.
        // ⚠ **Uniform glass story cards, and no rules between them (ADR 0104).**
        // This is ADR 0092's call on the app's own news screen, arriving here:
        // a divider between two cards is a seam drawn twice, and the row's own
        // edge already says where it ends.
        //
        VStack(alignment: .leading, spacing: 6) {
          Spacer(minLength: 0)
          ForEach(rest) { item in
            GlassSurface(radius: Rad.thumb) {
              HeadlineRow(item: item, now: entry.date)
                .padding(7)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
          }
          Spacer(minLength: 0)
        }
      } else {
        NewsEmptyState(copy: entry.copy, followsNothing: entry.followsNothing)
      }
    }
    .padding(13)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var header: some View {
    HStack(spacing: 7) {
      Mark(size: 16)
      W.eyebrow(entry.copy.news)
      Spacer(minLength: 4)
      W.eyebrow(entry.copy.clubCount, color: Tok.ink45, size: 10)
    }
    .padding(.bottom, 8)
  }
}

/// The lead: picture, attribution, two-line headline.
///
/// ⚠ With no cached image this is NOT a grey plate — an empty picture box is
/// indistinguishable from a broken widget. It becomes a lime-ruled headline
/// block, which is a deliberate-looking layout at any width.
private struct LeadStory: View {
  let item: NewsSnapshot.Item
  let now: Date

  var body: some View {
    Link(destination: item.url) {
      if let image = NewsImage.load(item) {
        ZStack(alignment: .bottomLeading) {
          Image(uiImage: image)
            .resizable()
            .fullColorInWidget()
            .scaledToFill()
            .frame(height: 116)
            .clipped()
          // ⚠ `scrim`, not `ground`. ADR 0104 lightened `ground` to `#0f1316`;
          // this fade has to stay near-black or the headline loses the picture
          // behind it. See the token's own note.
          LinearGradient(
            colors: [Tok.scrim.opacity(0), Tok.scrim.opacity(0.62), Tok.scrim.opacity(0.94)],
            startPoint: .init(x: 0.5, y: 0.22), endPoint: .bottom
          )
          meta
            .padding(.horizontal, 11)
            .padding(.bottom, 10)
        }
        .frame(height: 116)
        .clipShape(RoundedRectangle(cornerRadius: Rad.thumb, style: .continuous))
      } else {
        HStack(spacing: 0) {
          Rectangle().fill(Tok.accent).frame(width: 2)
          meta.padding(.leading, 9)
        }
        .padding(.bottom, 3)
      }
    }
  }

  private var meta: some View {
    VStack(alignment: .leading, spacing: 5) {
      Attribution(item: item, now: now, ink: Tok.ink62)
      Text(item.title)
        .font(.system(size: 15, weight: .bold))
        .foregroundStyle(Tok.ink)
        .lineLimit(2)
        .minimumScaleFactor(0.85)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

private struct HeadlineRow: View {
  let item: NewsSnapshot.Item
  let now: Date

  var body: some View {
    Link(destination: item.url) {
      HStack(spacing: 8) {
        if let image = NewsImage.load(item) {
          Image(uiImage: image)
            .resizable()
            .fullColorInWidget()
            .scaledToFill()
            .frame(width: 44, height: 44)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        VStack(alignment: .leading, spacing: 4) {
          Text(item.title)
            .font(.system(size: 12.5, weight: .semibold))
            .foregroundStyle(Tok.ink78)
            .lineLimit(2)
            .minimumScaleFactor(0.85)
            .fixedSize(horizontal: false, vertical: true)
          Attribution(item: item, now: now, ink: Tok.ink50)
        }
      }
    }
  }
}

/// `SEVILLA · MARCA 3h` — and `MARCA 5h` when the feed gives no topic.
private struct Attribution: View {
  let item: NewsSnapshot.Item
  let now: Date
  let ink: Color

  var body: some View {
    HStack(spacing: 5) {
      if let topic = item.topic, !topic.isEmpty {
        W.eyebrow(topic.uppercased(), size: 8.5)
        Circle().fill(Tok.ink45).frame(width: 2.5, height: 2.5)
      }
      W.eyebrow(item.publisher, color: Tok.tileInk, size: 8.5)
      Text(W.age(from: item.filedAt, to: now))
        .font(Tok.numerals(8.5, .semibold))
        .foregroundStyle(ink)
    }
  }
}

/// ⚠ Two sentences, as `EmptyState` documents for fixtures: follow a club, or
/// wait for the feed. Never one "Nothing here".
private struct NewsEmptyState: View {
  let copy: NewsSnapshot.Copy
  let followsNothing: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(followsNothing ? copy.followPrompt : copy.noHeadlines)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Tok.ink62)
        .lineLimit(3)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

/// A cached headline image, or nothing.
///
/// ⚠ Same rule as `CrestView`: read the App Group, never the network. Written
/// by `src/features/news/images.ts` at `news/{id}.jpg`, already downscaled —
/// a widget process decoding a publisher's full-size JPEG is how the extension
/// gets killed for exceeding its memory budget.
enum NewsImage {
  static func load(_ item: NewsSnapshot.Item) -> UIImage? {
    guard
      item.hasImage,
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: NewsSnapshot.appGroup
      ),
      let data = try? Data(contentsOf: container.appendingPathComponent("news/\(item.id).jpg"))
    else { return nil }
    return UIImage(data: data)
  }
}
