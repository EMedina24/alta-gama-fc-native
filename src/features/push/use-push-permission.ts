/**
 * Where the banner permission stands, as React state (ADR 0136).
 *
 * ⚠ Exists for exactly one consumer: the account sheet's truthful footnote. A
 * reader who deferred the prompt sees green switches over a note that says the
 * settings were "saved" — true of the registration (ADR 0136 decoupled it from
 * the permission), and a lie about the BANNERS, which iOS will never show. This
 * hook is how the sheet knows to say so instead.
 *
 * ⚠ Re-checked on every foreground: Settings is where a denial gets reversed,
 * and the reader arrives back here expecting the sheet to have noticed.
 *
 * ⚠ `'unknown'` until the first async answer lands — render the ordinary note
 * on it, never the warning: flashing "notifications are off" at every reader
 * for one frame is the wrong kind of honesty.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getPermissionState, type PermissionState } from './capability';

export function usePushPermission(): PermissionState | 'unknown' {
  const [state, setState] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    let alive = true;
    const check = () => {
      void getPermissionState().then((answer) => {
        if (alive) setState(answer);
      });
    };
    check();
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') check();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return state;
}
