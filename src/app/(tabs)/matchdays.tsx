import { StyleSheet, Text, View } from 'react-native';

import { Colors, Type } from '@/constants/theme';

export default function MatchdaysScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Matchdays</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
  },
  title: { ...Type.largeTitle, color: Colors.dark.text },
});
