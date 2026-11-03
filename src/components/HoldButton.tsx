import type { PointerEvent, ReactNode } from 'react';

/** A button that counts as held for as long as a finger or the mouse stays down on it. */
export function HoldButton({
  label,
  onHold,
  children,
  wide = false,
}: {
  label: string;
  onHold: (down: boolean) => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    onHold(true);
    try {
      // Keep the hold even if the finger slides off the button.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture; release then comes from pointerup instead.
    }
  };
  const up = () => onHold(false);
  return (
    <button
      type="button"
      className={wide ? 'hold wide' : 'hold'}
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
