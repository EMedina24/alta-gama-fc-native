import { Colors } from '@/constants/theme';

/**
 * The app is dark-only for v1 (`userInterfaceStyle: "dark"` in app.json, and
 * `Colors.light` is an alias of dark). This returns the palette unconditionally
 * rather than reading the system scheme — a scheme read here would be a lie the
 * rest of the app then has to branch on.
 */
export function useTheme() {
  return Colors.dark;
}
