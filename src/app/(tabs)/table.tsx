import { StyleSheet, Text, View } from 'react-native';

import { Colors, Type } from '@/constants/theme';

export default function TableScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Table</Text>
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
