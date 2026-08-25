import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const c = Colors.dark;

  return (
    <NativeTabs
      backgroundColor={c.card}
      iconColor={{ default: c.textFaint, selected: c.accent }}
      labelStyle={{
        default: { color: c.textFaint },
        selected: { color: c.accent },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'smallcircle.filled.circle', selected: 'smallcircle.filled.circle.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matchdays">
        <NativeTabs.Trigger.Label>Matchdays</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="table">
        <NativeTabs.Trigger.Label>Table</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="clubs">
        <NativeTabs.Trigger.Label>Clubs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
