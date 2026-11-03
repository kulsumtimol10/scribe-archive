import { describe as group, expect, it } from 'vitest';
import { breed, DRAGONS, fromBond, lookAt, OWN_ID, pickPair, roster, TAIL_INFO } from './codex';
import { choose } from './threshing';

const andarna = DRAGONS.find((d) => d.id === 'andarna')!;
const own = fromBond(choose([0, 0, 2, 0, 2, 3], 'Violet'));

group('the dragons', () => {
  it('have unique ids and names, none of them the reader slot', () => {
    expect(new Set(DRAGONS.map((d) => d.id)).size).toBe(DRAGONS.length);
    expect(new Set(DRAGONS.map((d) => d.name)).size).toBe(DRAGONS.length);
    expect(DRAGONS.some((d) => d.id === OWN_ID)).toBe(false);
  });

  it('each start their looks in the book they first fly in, in order', () => {
    for (const d of DRAGONS) {
      expect(d.looks[0].from).toBe(d.from);
      for (let i = 1; i < d.looks.length; i++) expect(d.looks[i].from).toBeGreaterThan(d.looks[i - 1].from);
    }
  });
});

group('lookAt', () => {
  it("shows Andarna as she was in Book I until the reader gets further", () => {
    expect(lookAt(andarna, 1)).toMatchObject({ colour: 'gold', tail: 'feathertail' });
    expect(lookAt(andarna, 2)).toMatchObject({ colour: 'iridescent', tail: 'scorpiontail' });
    expect(lookAt(andarna, 3)).toMatchObject({ colour: 'iridescent' });
  });
});

group('breed', () => {
  it('names the colour and tail, or just the colour when the tail is unknown', () => {
    expect(breed({ from: 1, colour: 'black', tail: 'morningstartail' })).toBe('Black morningstartail');
    expect(breed({ from: 1, colour: 'brown', tail: null })).toBe('Brown');
  });

  it('has a name and a line for every tail', () => {
    for (const info of Object.values(TAIL_INFO)) expect(info.text.length).toBeGreaterThan(10);
  });
});

group('roster', () => {
  it('keeps later books sealed', () => {
    expect(roster(1, null).some((d) => d.from > 1)).toBe(false);
    expect(roster(2, null).some((d) => d.id === 'thoirt')).toBe(true);
  });

  it("puts the reader's own dragon first", () => {
    expect(roster(1, own)[0]).toBe(own);
    expect(own).toMatchObject({ id: OWN_ID, own: true, rider: 'Violet' });
  });
});

group('pickPair', () => {
  const list = roster(1, own);

  it('starts with Tairn and Sgaeyl', () => {
    expect(pickPair('', list).map((d) => d.id)).toEqual(['tairn', 'sgaeyl']);
  });

  it('reads both sides from the address', () => {
    expect(pickPair('?a=cath&b=yours', list).map((d) => d.id)).toEqual(['cath', 'yours']);
  });

  it('falls back for unknown or sealed dragons', () => {
    expect(pickPair('?a=nope&b=thoirt', list).map((d) => d.id)).toEqual(['tairn', 'sgaeyl']);
  });

  it('never shows one dragon on both sides', () => {
    expect(pickPair('?a=sgaeyl&b=sgaeyl', list).map((d) => d.id)).toEqual(['sgaeyl', 'tairn']);
    expect(pickPair('?a=tairn', list).map((d) => d.id)).toEqual(['tairn', 'sgaeyl']);
  });
});
