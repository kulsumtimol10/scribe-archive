/**
 * A dragon in flight, side on, facing right. Drawn in a 600×240 box: place it
 * with a transform. Colours are set as inline styles so they can be CSS
 * variables on the page and plain hex when a wallpaper is exported.
 */
const BODY =
  'M592,138 L566,126 L548,116 L528,98 L536,118 L516,122 C490,128 470,140 450,150 C420,140 390,138 360,142 C320,146 280,150 240,160 C190,172 140,186 100,196 C70,203 45,206 22,200 L8,188 L14,210 L2,226 L26,214 C50,218 80,214 110,210 C160,202 210,194 250,190 L262,214 L250,236 L272,236 L280,208 C310,200 350,196 380,190 L392,210 L384,226 L404,226 L408,198 C430,184 450,170 470,160 C500,150 525,146 548,148 L572,146 Z';
const FAR_WING = 'M404,142 L426,72 L468,22 L540,4 Q500,40 506,58 L556,52 Q514,86 512,104 L474,144 Z';
const NEAR_WING =
  'M384,146 L346,84 L312,34 L214,6 Q236,40 228,58 L148,40 Q188,80 188,100 L106,96 Q166,122 176,140 L118,158 Q200,164 252,158 Z';
const SPINES =
  'M440,146 L446,132 L452,148 M410,140 L416,126 L422,141 M380,141 L386,127 L392,142 M340,145 L346,131 L352,146 M300,150 L306,136 L312,152 M260,158 L266,145 L272,160';
const WING_BONES = 'M312,34 L214,6 M312,34 L148,40 M312,34 L106,96 M312,34 L118,158 M346,84 L312,34';
/** The top edges that catch the light: back, tail and the near wing's leading edge. */
const RIM_BACK =
  'M592,138 L566,126 L548,116 L528,98 L536,118 L516,122 C490,128 470,140 450,150 C420,140 390,138 360,142 C320,146 280,150 240,160 C190,172 140,186 100,196 C70,203 45,206 22,200 L8,188 L14,210 L2,226 L26,214';
const RIM_WING = 'M384,146 L346,84 L312,34 L214,6 Q236,40 228,58 L148,40 Q188,80 188,100 L106,96 Q166,122 176,140 L118,158';

export interface DragonColours {
  body: string;
  wing: string;
  bone: string;
  rim: string;
  eye: string;
}

interface DragonProps {
  colours: DragonColours;
  /** Id of a blur filter the parent defines, to soften the rim light into a glow. */
  rimFilter?: string;
  rimOpacity?: number;
  transform?: string;
}

export function Dragon({ colours, rimFilter, rimOpacity = 0.6, transform }: DragonProps) {
  return (
    <g transform={transform}>
      <path d={FAR_WING} style={{ fill: colours.wing }} opacity={0.85} />
      <g
        filter={rimFilter ? `url(#${rimFilter})` : undefined}
        style={{ fill: 'none', stroke: colours.rim }}
        strokeOpacity={rimOpacity}
        strokeWidth={2.5}
      >
        <path d={RIM_BACK} />
        <path d={RIM_WING} />
      </g>
      <path d={BODY} style={{ fill: colours.body }} />
      <path d={SPINES} style={{ fill: colours.body }} />
      <path d={NEAR_WING} style={{ fill: colours.wing }} />
      <path d={WING_BONES} style={{ fill: 'none', stroke: colours.bone }} strokeWidth={2.5} />
      <circle cx={556} cy={130} r={2.6} style={{ fill: colours.eye }} />
    </g>
  );
}
