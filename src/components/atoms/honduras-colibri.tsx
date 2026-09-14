/**
 * The Liga Nacional colibrí, as background art for the deep crown (ADR 0170) —
 * on `PremierCrest`/`LaLigaGlyph`'s pattern (ADR 0165/0167), and the first mark
 * whose master is TRACED from a raster rather than cut from a vector.
 *
 * ⚠ **Drawn, not loaded** — no SVG transformer is configured, so the geometry
 * lives here verbatim. The master is `assets/images/HN.svg` (design source;
 * no build step reads it, and nothing `require`s it), itself traced from
 * `assets/images/hondurasLeague.png` — supplied by Ed (2026-09-14), a high-res
 * copy of the mark the wire's pill artwork already draws. Trace parameters are
 * recorded in the master so it can be regenerated: alpha threshold 128,
 * shared-edge cancellation for the boundaries, Ramer-Douglas-Peucker at
 * epsilon 1.8px on the 1504×1312 source.
 *
 * ⚠ **Four disjoint islands in one `d`** — body, head piece, C-ring, star —
 * and NO nesting: the ball's interior is genuinely transparent in the source,
 * so the ring and star are islands, not counters, and no `fillRule` is needed
 * (the alpha was checked, not assumed — an earlier read of the render guessed
 * "holes" and the loop table said otherwise).
 *
 * ⚠ Landscape (ratio ≈ 1.16); the ball sits bottom-right, so the screen-edge
 * bleed cuts it first and leaves the bird readable.
 *
 * ⚠ **The fade IS the fill** (ADR 0165): a vertical gradient running to zero,
 * so the foot dissolves inside one `Svg` and only the physical screen edge
 * hard-clips (ADR 0098).
 *
 * ⚠ Translucency rides `stopOpacity`, never an rgba stop colour (trap 42).
 *
 * ⚠ Decorative. The league is named in the pill beside it, so this is
 * `accessible` false with no label — announcing it would say the name twice.
 */
import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** The traced islands' own bounding box — the master's viewBox. */
const BOX = { x: 92, y: 33, width: 1338, height: 1149 } as const;

/**
 * Landscape, and exported so a caller sizing the art off its height never
 * re-derives it — `PL_CREST_RATIO`'s contract.
 */
export const HONDURAS_COLIBRI_RATIO = BOX.width / BOX.height;

const PATH =
  'M92 33L235 74L405 132L557 190L659 234L755 282L832 330L884 375L917 419L934 450L948 485L962 546L964 568L962 627L946 698L926 745L917 740L898 721L848 762L800 812L771 852L749 892L735 929L728 960L726 1015L736 1066L748 1098L764 1130L794 1176L792 1182L783 1180L747 1152L680 1087L631 1024L604 980L588 948L564 884L550 820L548 749L557 687L522 684L465 670L424 655L375 630L325 595L280 552L252 517L232 486L206 434L191 384L364 419L317 386L279 354L238 313L191 255L154 197L128 146L102 78ZM1310 176L1391 180L1430 185L1430 189L1427 197L1392 194L1334 196L1292 202L1249 212L1184 238L1148 260L1126 277L1080 324L1046 374L1030 406L1012 454L998 516L993 559L983 559L980 519L971 474L962 445L944 406L921 371L891 338L855 310L826 296L826 291L837 269L858 238L878 217L904 198L921 190L950 182L1013 180L1129 185ZM912 817L939 817L976 824L1008 838L1025 849L1048 870L1068 898L1078 920L1088 956L1088 960L1056 958L1065 938L1062 915L1049 890L1027 866L992 845L959 836L920 836L900 842L882 856L872 878L850 860L823 879L796 910L782 936L774 961L770 986L770 1007L776 1041L786 1066L796 1083L818 1109L841 1127L862 1138L885 1146L908 1150L936 1150L970 1141L996 1123L1004 1112L1006 1104L1036 1127L1015 1143L994 1154L971 1162L943 1167L902 1166L877 1160L845 1146L820 1129L795 1104L776 1075L762 1041L756 1012L755 984L761 945L773 913L790 885L815 858L847 836L876 824ZM896 894L928 956L999 949L950 1000L982 1072L920 1036L914 1035L860 1084L873 1011L815 976L811 971L882 963Z';

export interface HondurasColibriProps {
  /** The drawn height in points; the width follows `HONDURAS_COLIBRI_RATIO`. */
  height: number;
  /** Peak opacity, at the top of the mark. It fades to nothing at the foot. */
  alpha?: number;
}

export function HondurasColibri({ height, alpha = 0.1 }: HondurasColibriProps) {
  // ⚠ `useId`, never a literal: two of these in one tree would resolve both
  // `url(#…)` fills to whichever mounted first (trap 40).
  const id = `honduras-colibri-${useId().replace(/:/g, '')}`;
  return (
    <Svg
      width={height * HONDURAS_COLIBRI_RATIO}
      height={height}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
      accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#ffffff" stopOpacity={alpha} />
          <Stop offset={0.55} stopColor="#ffffff" stopOpacity={alpha * 0.55} />
          <Stop offset={1} stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={PATH} fill={`url(#${id})`} />
    </Svg>
  );
}
