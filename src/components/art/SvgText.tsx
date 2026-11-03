import { textX, type TextLine } from '../../lib/render';

/**
 * Preview text for an exportable SVG. Marked data-text so the export leaves it
 * out and redraws the same lines on the canvas with the page's fonts.
 */
export function SvgText({ lines }: { lines: TextLine[] }) {
  return (
    <>
      {lines.map((line) => (
        <text
          key={`${line.y}-${line.text}`}
          data-text=""
          x={textX(line)}
          y={line.y}
          fill={line.colour}
          fillOpacity={line.opacity}
          fontFamily={line.family}
          fontStyle={line.italic ? 'italic' : undefined}
          fontWeight={line.weight}
          fontSize={line.size}
          letterSpacing={line.letterSpacing}
          textAnchor={line.align === 'center' ? 'middle' : 'start'}
        >
          {line.text}
        </text>
      ))}
    </>
  );
}
