import { useGlobalSearchParams } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { LIQUID_GLASS } from '@/components/atoms';
import { Colors, Type } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useBoardEditing } from '@/store/board-edit';

export default function TabsLayout() {
  const c = Colors.dark;
  // ⚠ Tab labels are copy like any other string. They were hardcoded English
  // and stayed English with the whole app in Spanish.
  const { copy } = useI18n();
  /**
   * ⚠ The tab bar HIDES while the Board is being arranged (ADR 0199, the
   * kit's): the edit panel takes the bottom of the screen, and DONE is the one
   * way out. The `__DEV__` deep-link hook (`?boardEdit=1`) is derived here from
   * the route params exactly as the screen derives it — never copied into the
   * store by an effect — so a QA screenshot shows the real mode.
   */
  const boardEdit = useGlobalSearchParams<{ boardEdit?: string }>().boardEdit;
  const hidden = useBoardEditing() || (__DEV__ && boardEdit === '1');
  // ⚠ The Medina tab label (ADR 0194): Saira Bold, uppercase. `labelStyle`
  // takes `fontFamily`/`fontSize` but no `textTransform`, so the casing is
  // applied to the string. A face NativeTabs can't resolve falls back to SF.
  const label = (text: string) => text.toLocaleUpperCase();
  const face = { fontFamily: Type.tabLabel.fontFamily, fontSize: Type.tabLabel.fontSize };

  return (
    <NativeTabs
      hidden={hidden}
      // ⚠ ADR 0195: no colour where liquid glass exists — iOS 26 draws the bar
      // in system glass, which a `backgroundColor` would tint over. Below 26 it
      // stays 0093's opaque `tabBar` (the mock's `rgba(10,11,12,.92)` is not
      // expressible: NativeTabs draws the system material behind any colour).
      // ⚠ Trap 64: no animated opacity/transform ancestor, or the glass dies.
      backgroundColor={LIQUID_GLASS ? undefined : c.tabBar}
      iconColor={{ default: c.textFaint, selected: c.accent }}
      labelStyle={{
        default: { ...face, color: c.textFaint },
        selected: { ...face, color: c.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{label(copy.tabs.today)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'smallcircle.filled.circle', selected: 'smallcircle.filled.circle.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matchdays">
        <NativeTabs.Trigger.Label>{label(copy.tabs.matchdays)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="table">
        <NativeTabs.Trigger.Label>{label(copy.tabs.table)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="clubs">
        <NativeTabs.Trigger.Label>{label(copy.tabs.clubs)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
