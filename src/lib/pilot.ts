import { useMemo } from 'react';
import { choose, COLOURS, describe, loadBond } from './threshing';

export interface Pilot {
  /** "Branagh, a green scorpiontail", or a stand-in for readers who haven't been chosen yet. */
  name: string;
  colour: string;
  /** Whether this is the reader's own dragon from the Threshing. */
  own: boolean;
}

/** The dragon the reader rides: their own from the Threshing, or a black one on loan. */
export function usePilot(): Pilot {
  return useMemo(() => {
    const saved = loadBond();
    if (!saved) return { name: 'a borrowed black dragon', colour: '#0c0e13', own: false };
    const bond = choose(saved.answers, saved.rider);
    return { name: `${bond.dragonName}, ${describe(bond)}`, colour: COLOURS[bond.colour].art.body, own: true };
  }, []);
}
