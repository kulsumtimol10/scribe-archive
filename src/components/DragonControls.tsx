import { useEffect, useRef } from 'react';
import { STILL, type FlightInput } from '../lib/dragonFlight';
import { HoldButton } from './HoldButton';

type Steer = 'left' | 'right' | 'climb' | 'dive' | 'sprint';

const KEYS: Record<string, Steer> = {
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  w: 'climb',
  arrowup: 'climb',
  s: 'dive',
  arrowdown: 'dive',
  shift: 'sprint',
};

/**
 * Keyboard and hold-button controls for riding a dragon. Listens only while
 * `active`, and Esc calls `onEscape`. The scene reads `input` every frame.
 */
export function useDragonControls(active: boolean, onEscape: () => void) {
  const input = useRef<FlightInput>({ ...STILL });
  const keys = useRef(new Set<string>());
  const touches = useRef(new Set<Steer>());
  const escape = useRef(onEscape);
  escape.current = onEscape;

  const steer = () => {
    const held = (s: Steer) => touches.current.has(s) || [...keys.current].some((k) => KEYS[k] === s);
    input.current = {
      turn: (held('right') ? 1 : 0) - (held('left') ? 1 : 0),
      climb: (held('climb') ? 1 : 0) - (held('dive') ? 1 : 0),
      boost: held('sprint'),
    };
  };

  useEffect(() => {
    if (!active) return;
    const release = () => {
      keys.current.clear();
      touches.current.clear();
      steer();
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        escape.current();
        return;
      }
      if (!(key in KEYS)) return;
      e.preventDefault();
      keys.current.add(key);
      steer();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      steer();
    };
    release();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      release();
    };
  }, [active]);

  const hold = (s: Steer) => (isDown: boolean) => {
    if (isDown) touches.current.add(s);
    else touches.current.delete(s);
    steer();
  };

  return { input, hold };
}

/** The five hold buttons phones get under the view; hidden where there's a mouse and keyboard. */
export function DragonButtons({ hold }: { hold: ReturnType<typeof useDragonControls>['hold'] }) {
  return (
    <div className="ride-controls" aria-label="Flight controls">
      <HoldButton label="Turn left" onHold={hold('left')}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M14 4l-7 7 7 7" />
        </svg>
      </HoldButton>
      <HoldButton label="Climb" onHold={hold('climb')}>
        Climb
      </HoldButton>
      <HoldButton label="Sprint" onHold={hold('sprint')}>
        Sprint
      </HoldButton>
      <HoldButton label="Dive" onHold={hold('dive')}>
        Dive
      </HoldButton>
      <HoldButton label="Turn right" onHold={hold('right')}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M8 4l7 7-7 7" />
        </svg>
      </HoldButton>
    </div>
  );
}
