/**
 * The browse list — every club in the chosen league that the reader does not
 * already follow, in one double-bezel `Tray` (ADR 0090, revising 0082's flat
 * card: the tray pattern is sanctioned now, and this list is its second home
 * after the search field).
 *
 * ⚠ **Followed clubs are filtered OUT by the screen, not here.** The rail is
 * the only place a subscribed club appears; a club in both would make the rail
 * look like a shortcut rather than the state it is.
 *
 * ⚠ **This organism no longer has a `subscribed` variant.** It used to render
 * the follow list as a second vertical list with an unfollow `Switch` in each
 * row. Both are gone: the rail replaced the list, and unfollow moved to the club
 * page's `Match alerts`, which confirms first. Unfollowing drops a season of
 * calendar entries, and the old row did it on a single tap with no undo.
 *
 * ⚠ ONE tray, not one card per row — rows separated by hairlines with none
 * after the last. The Tray's inner clips the first and last rows' pressed
 * ground to its corners.
 */
import { ClubRow, Tray } from '@/components/molecules';

export interface BrowseClub {
  slug: string;
  name: string;
  place: string | null;
  crest: string | null;
  abbr: string;
  followAccessibilityLabel: string;
}

export interface ClubBrowserProps {
  clubs: readonly BrowseClub[];
  followLabel: string;
  onFollow: (slug: string) => void;
  onOpen: (slug: string) => void;
}

export function ClubBrowser({ clubs, followLabel, onFollow, onOpen }: ClubBrowserProps) {
  return (
    <Tray>
      {clubs.map((club, i) => (
        <ClubRow
          key={club.slug}
          name={club.name}
          place={club.place}
          crest={club.crest}
          abbr={club.abbr}
          followLabel={followLabel}
          followAccessibilityLabel={club.followAccessibilityLabel}
          onOpen={() => onOpen(club.slug)}
          onFollow={() => onFollow(club.slug)}
          rule={i < clubs.length - 1}
        />
      ))}
    </Tray>
  );
}
