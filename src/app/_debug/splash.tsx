/**
 * Splash replay harness (ADR 0134). The real splash plays once per cold
 * launch, which makes iterating on it through rebuilds unbearable — this
 * screen mounts `SplashOverlay` over a mock crown board and replays it by
 * remounting on a key. `altagamafc://_debug/splash`.
 *
 * Also the Archivo runtime check: iOS resolves `fontFamily` by POSTSCRIPT
 * name and a wrong one silently renders SF. The two sample lines must look
 * like Archivo (flat-topped A, wide counters) and visibly DIFFER from the
 * system-heavy line beside them.
 *
 * `RM` runs the Reduce-Motion variant via the overlay's prop — no simulator
 * settings round-trip.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Crown } from '@/components/templates/crown';
import { SplashOverlay } from '@/components/templates/splash-overlay';
import { Colors, Radius, Spacing, Splash, Type } from '@/constants/theme';

export default function SplashDebug() {
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const replay = (rm: boolean) => {
    setReduceMotion(rm);
    setPlaying(true);
    setRun((r) => r + 1);
  };

  return (
    <View style={styles.screen}>
      {/* The mock board: the crown the sheet is supposed to become, and the
          font check the splash itself cannot prove. The board is NOT animated
          — the real layout doesn't either (trap 64). */}
      <View style={styles.board}>
        <Crown topInset={insets.top} eyebrow="Splash harness" title="Mock board" padBottom={Spacing.five} />
        <View style={styles.body}>
          <Text style={styles.archivoBlack}>ARCHIVO 900 — Aa Gg Rr</Text>
          <Text style={styles.archivoXBold}>ARCHIVO 800 — Aa Gg Rr</Text>
          <Text style={styles.systemHeavy}>SYSTEM 900 — Aa Gg Rr (must differ)</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.button} onPress={() => replay(false)}>
              <Text style={styles.buttonLabel}>Replay</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => replay(true)}>
              <Text style={styles.buttonLabel}>Replay RM</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {playing && (
        <SplashOverlay
          key={`${run}-${reduceMotion}`}
          reduceMotion={reduceMotion}
          onDone={() => setPlaying(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.background },
  board: { flex: 1 },
  body: { padding: Spacing.five, gap: Spacing.three },
  archivoBlack: {
    fontFamily: Splash.type.word.family,
    fontSize: 22,
    color: Colors.dark.text,
  },
  archivoXBold: {
    fontFamily: Splash.type.sub.family,
    fontSize: 22,
    color: Colors.dark.text,
  },
  systemHeavy: { fontSize: 22, fontWeight: '900', color: Colors.dark.textSecondary },
  buttons: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.five },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.control,
    backgroundColor: Colors.dark.accent,
  },
  buttonLabel: { ...Type.footnote, color: Colors.dark.onAccent, fontWeight: '700' },
});
