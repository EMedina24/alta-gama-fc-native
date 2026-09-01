import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function TabsLayout() {
  const c = Colors.dark;
  // ⚠ Tab labels are copy like any other string. They were hardcoded English
  // and stayed English with the whole app in Spanish.
  const { copy } = useI18n();

  return (
    <NativeTabs
      // ⚠ The mock's bar is `rgba(10,11,12,.92)`; `NativeTabs` takes a colour
      // and draws the system's own material behind it, so alpha here is not
      // ours to control — this is the opaque equivalent (ADR 0093).
      backgroundColor={c.tabBar}
      iconColor={{ default: c.textFaint, selected: c.accent }}
      labelStyle={{
        default: { color: c.textFaint },
        selected: { color: c.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{copy.tabs.today}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'smallcircle.filled.circle', selected: 'smallcircle.filled.circle.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matchdays">
        <NativeTabs.Trigger.Label>{copy.tabs.matchdays}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="table">
        <NativeTabs.Trigger.Label>{copy.tabs.table}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="clubs">
        <NativeTabs.Trigger.Label>{copy.tabs.clubs}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
