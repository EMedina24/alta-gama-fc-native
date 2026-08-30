/** Dev tool: fire the news seam (`openArticle`) on mount, so the in-app
 *  browser's presentation can be verified by deep link + screenshot alone. */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';
import { openArticle } from '@/features/news/open';

const SAMPLE = 'https://www.sport.es/es/';

export default function BrowserDebug() {
  useEffect(() => {
    void openArticle(SAMPLE);
  }, []);
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>openArticle fired → {SAMPLE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    padding: Spacing.five,
  },
  label: { ...Type.footnote, color: Colors.dark.textSecondary },
});
