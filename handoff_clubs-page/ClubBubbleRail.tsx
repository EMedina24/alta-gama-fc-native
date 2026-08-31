import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import { Crest } from '@/components/atoms/crest';
import { Check } from '@/components/atoms/check';
import { clubColour, withAlpha } from '@/lib/club-colour';
import { bandColour } from '@/lib/table-bands';

type RailClub = {
  slug: string;
  short: string;
  /** League table position. `null` outside LaLiga Primera — no other league publishes a table. */
  position: number | null;
};

/**
 * The subscribed-clubs rail on the Clubs screen.
 *
 * A horizontal rail of 88pt crest bubbles, NOT a list: subscriptions are a
 * small, glanceable set (median 1–3) and the crest is the fastest thing a fan
 * reads. The vertical list this replaced spent 68pt of height per club to say
 * the same thing, and pushed Browse below the fold on an iPhone SE.
 *
 * ⚠⚠ **The bubble has exactly ONE action: open the club.** The lime check is an
 * indicator with `pointerEvents: 'none'` — it is NOT an unfollow button. An
 * unfollow tap target inside an 88pt bubble lands within a thumb's width of the
 * open-club tap, and unfollowing drops a whole season of calendar entries.
 * Unfollow lives on the club page (`Match alerts`), one deliberate level in.
 *
 * ⚠ The rank badge renders only when `position` is non-null. Do not substitute a
 * dash or "–" for the leagues without a table: absent means absent.
 */
export function ClubBubbleRail({ clubs }: { clubs: RailClub[] }) {
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 26 }}
    >
      {clubs.map((club) => {
        const colour = clubColour(club.slug);

        return (
          <Pressable
            key={club.slug}
            onPress={() => router.push(`/club/${club.slug}`)}
            accessibilityRole="button"
            accessibilityLabel={club.short}
            style={({ pressed }) => ({
              width: 88,
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.945 : 1 }],
            })}
          >
            <View style={{ width: 88, height: 88 }}>
              {/* Outer ring — club colour hairline, coloured glow beneath */}
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 44,
                  padding: 4,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: withAlpha(colour, 0.38),
                  shadowColor: colour,
                  shadowOpacity: 0.5,
                  shadowRadius: 13,
                  shadowOffset: { width: 0, height: 10 },
                }}
              >
                {/* Inner core — club colour lit from the top, crest floating on it */}
                <View
                  style={{
                    flex: 1,
                    borderRadius: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: withAlpha(colour, 0.16),
                    overflow: 'hidden',
                  }}
                >
                  <Crest slug={club.slug} size={54} />
                </View>
              </View>

              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -1,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: theme.accent,        // #c8f25a
                  borderWidth: 2.5,
                  borderColor: theme.bg,                // #0a0b0c
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={12} color={theme.accentInk} />
              </View>

              {club.position !== null && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 2,
                    height: 20,
                    paddingHorizontal: 7,
                    borderRadius: 7,
                    backgroundColor: '#0f1114',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9.5,
                      fontWeight: '800',
                      letterSpacing: 0.4,
                      fontVariant: ['tabular-nums'],
                      color: bandColour(club.position) ?? theme.text,
                    }}
                  >
                    {`#${club.position}`}
                  </Text>
                </View>
              )}
            </View>

            <Text
              numberOfLines={1}
              style={{
                marginTop: 13,
                width: '100%',
                textAlign: 'center',
                fontSize: 12,
                lineHeight: 15,
                fontWeight: '600',
                letterSpacing: -0.18,
                color: theme.text,
              }}
            >
              {club.short}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
