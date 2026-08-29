import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { theme } from '@/constants/theme';
import { PitchGlyph } from '@/components/atoms/pitch-glyph';
import { Chevron } from '@/components/atoms/chevron';
import { useI18n } from '@/lib/i18n';

/**
 * The Starting XI entry on the club page.
 *
 * Sits BETWEEN the subscribe block and the Fixtures / Players segmented control
 * — it is a club action, not a squad detail, and it must not push the season
 * spine below the fold.
 *
 * ⚠⚠ **Needs a published squad, so LaLiga Primera only.** Same constraint as the
 * Players tab: `GET /cronogol/teams/{slug}/squad` answers `200 {players: []}`
 * for every other league. When there is no squad the row STAYS and goes inert
 * with the `squadEmpty` copy — a removed row reads as a missing feature, an
 * explained one reads as missing data.
 */
export function ClubStartingXIRow({ slug, league }: { slug: string; league: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const enabled = league === 'laliga';

  return (
    <Pressable
      disabled={!enabled}
      onPress={() => router.push(`/club/${slug}/starting-xi`)}
      accessibilityRole="button"
      accessibilityLabel={t('xiTitle')}
      accessibilityHint={enabled ? t('xiBody') : t('squadEmpty')}
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: theme.raised,      // #15171a
        borderRadius: 22,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: enabled ? theme.accentWash : theme.tile,
        }}
      >
        <PitchGlyph size={20} color={enabled ? theme.accent : theme.textFaint} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 18,
            fontWeight: '600',
            letterSpacing: -0.15,
            color: enabled ? theme.text : theme.textMuted,
          }}
        >
          {t('xiTitle')}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12.5, lineHeight: 17.5, color: theme.textMuted }}>
          {enabled ? t('xiBody') : t('squadEmpty')}
        </Text>
      </View>

      <Chevron size={13} color={enabled ? theme.accent : theme.textFaint} />
    </Pressable>
  );
}

/**
 * Copy for `src/lib/i18n` — the Spanish is the app's own register, not a
 * machine translation of the English.
 *
 *   en: { xiTitle: 'Starting XI',  xiBody: 'Put your eleven on a pitch and share the card.' }
 *   es: { xiTitle: 'Once inicial', xiBody: 'Coloca tus once en el campo y comparte la imagen.' }
 */
