/** Dev tool: mark onboarding done and land in the app, so a screen behind the
 *  gate can be reached without tapping through the flow. */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { setOnboarded } from '@/store/preferences';

export default function SkipOnboarding() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOnboarded(true);
    setDone(true);
  }, []);
  return done ? <Redirect href="/" /> : null;
}
