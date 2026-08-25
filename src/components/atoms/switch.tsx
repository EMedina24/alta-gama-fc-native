/**
 * The system switch, wired to the theme.
 *
 * ⚠ React Native's `<Switch>` IS `UISwitch` on iOS, at exactly the 51×31 the
 * design specifies — so there is nothing to build and no reason to reach for a
 * component library. `Size.switchW`/`switchH` document the match; they are not
 * applied, because forcing a size on the native control is how you get a
 * blurry scaled one.
 */
import { Switch as RNSwitch } from 'react-native';

import { Colors } from '@/constants/theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** A disabled switch must always be accompanied by its reason (SPEC §3.6). */
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function Switch({ value, onValueChange, disabled = false, accessibilityLabel }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: Colors.dark.raisedAlt, true: Colors.dark.accent }}
      thumbColor={Colors.dark.text}
      ios_backgroundColor={Colors.dark.raisedAlt}
      style={disabled ? { opacity: 0.4 } : undefined}
    />
  );
}
