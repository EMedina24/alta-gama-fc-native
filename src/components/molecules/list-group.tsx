/**
 * An inset grouped list — one rounded glass card with hairlines between its
 * rows (ADR 0208), the Medina kit's `Group` over a scene.
 *
 * It replaces the two inline copies of the same card (the account sheet's
 * `group` and onboarding's), which differed only by whether they drew the
 * glass line.
 *
 * ⚠ The glass is a LAYER (`GlassSurface`) behind the rows, never a wrapper
 * around them, and nothing that contains a group may fade or scale it — an
 * alpha or a scale on a glass ancestor kills the glass (0120/0122; trap 80).
 * That is why Settings has no staggered entrance: the account sheet's `Rise`
 * was an opacity animation on exactly these cards' parents.
 *
 * ⚠ Separators are inserted BETWEEN children, so a child that renders `null`
 * leaves no doubled rule. `false`/`null` children are dropped before counting.
 * A child that belongs to the row above it (the reminder's lead chips) is
 * passed INSIDE that row's fragment, not as a sibling, so no rule cuts it off.
 */
import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassSurface, Hairline } from '@/components/atoms';
import { Colors, Radius, Size } from '@/constants/theme';

export interface ListGroupProps {
  children: ReactNode;
}

export function ListGroup({ children }: ListGroupProps) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      <GlassSurface style={styles.shell} flatStyle={styles.flat} glass="regular" />
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radius.group, overflow: 'hidden' },
  shell: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.group,
    borderWidth: Size.glassBorder,
    borderColor: Colors.dark.glassLine,
  },
  flat: { backgroundColor: Colors.dark.glassFill },
});
