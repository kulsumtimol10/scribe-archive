import { describe, expect, it } from 'vitest';
import { heightAt } from './archiveMap';
import { CEILING, CLEARANCE, fly, takeOff, type Ride } from './dragonFlight';
import { GATE_RADIUS, GATES, ghostAt, parseRecord, throughGate, type GhostSample } from './warGames';

describe('the course', () => {
  it('hangs every gate clear of the ground and under the ceiling', () => {
    for (const gate of GATES) {
      expect(gate.y, gate.name).toBeGreaterThan(Math.max(heightAt(gate.x, gate.z), 0) + CLEARANCE);
      expect(gate.y, gate.name).toBeLessThan(CEILING - GATE_RADIUS);
    }
  });

  it('spaces the gates out, never too far apart', () => {
    for (let i = 1; i < GATES.length; i++) {
      const a = GATES[i - 1];
      const b = GATES[i];
      const gap = Math.hypot(a.x - b.x, a.z - b.z);
      expect(gap, `${a.name} → ${b.name}`).toBeGreaterThan(8);
      expect(gap, `${a.name} → ${b.name}`).toBeLessThan(20);
    }
  });

  it('starts where the dragon takes off, straight ahead of it', () => {
    const start = takeOff();
    const first = GATES[0];
    expect(Math.abs(first.x - start.x)).toBeLessThan(2);
    expect(first.z).toBeLessThan(start.z);
    // Flying straight on from take-off goes through the first gate.
    let ride: Ride = start;
    let through = false;
    for (let t = 0; t < 3 && !through; t += 1 / 60) {
      ride = fly(ride, { turn: 0, climb: 0, boost: false }, 1 / 60, heightAt);
      through = throughGate(ride, first);
    }
    expect(through).toBe(true);
  });
});

describe('the whole course', () => {
  it('can be flown gate to gate by a simple autopilot', () => {
    let ride = takeOff();
    let next = 0;
    let time = 0;
    while (next < GATES.length && time < 180) {
      const gate = GATES[next];
      const want = Math.atan2(gate.x - ride.x, gate.z - ride.z);
      const off = Math.atan2(Math.sin(want - ride.heading), Math.cos(want - ride.heading));
      const input = {
        // The dragon turns right (heading falls) for positive turn.
        turn: Math.max(-1, Math.min(1, -off * 3)),
        climb: Math.max(-1, Math.min(1, (gate.y - ride.y) / 3)),
        boost: false,
      };
      ride = fly(ride, input, 1 / 60, heightAt);
      time += 1 / 60;
      if (throughGate(ride, gate)) next++;
    }
    expect(next).toBe(GATES.length);
    // A perfect line takes under 20 seconds; real riders will take longer.
    expect(time).toBeGreaterThan(12);
  });
});

describe('throughGate', () => {
  it('counts only a pass close to the centre', () => {
    const gate = GATES[1];
    expect(throughGate({ x: gate.x + 1, y: gate.y - 1, z: gate.z }, gate)).toBe(true);
    expect(throughGate({ x: gate.x + 5, y: gate.y, z: gate.z }, gate)).toBe(false);
  });
});

describe('ghostAt', () => {
  const path: GhostSample[] = [
    [0, 10, 0, 0],
    [1, 10, 2, 0.2],
    [2, 12, 4, 0.4],
  ];

  it('glides between samples', () => {
    const [x, y, z, h] = ghostAt(path, 0.15)!;
    expect(x).toBeCloseTo(1.5);
    expect(y).toBeCloseTo(11);
    expect(z).toBeCloseTo(3);
    expect(h).toBeCloseTo(0.3);
  });

  it('turns the short way across ±π', () => {
    const [, , , h] = ghostAt(
      [
        [0, 0, 0, 3.1],
        [0, 0, 0, -3.1],
      ],
      0.05,
    )!;
    expect(Math.abs(h)).toBeGreaterThan(3.1);
  });

  it('is gone before the start and after the finish', () => {
    expect(ghostAt(path, -1)).toBeNull();
    expect(ghostAt(path, 5)).toBeNull();
    expect(ghostAt([], 0)).toBeNull();
  });
});

describe('parseRecord', () => {
  it('reads a record and drops broken samples', () => {
    const raw = JSON.stringify({ best: 61.5, ghost: [[1, 2, 3, 0], [1, 2], 'x'] });
    expect(parseRecord(raw)).toEqual({ best: 61.5, ghost: [[1, 2, 3, 0]] });
  });

  it('ignores anything broken', () => {
    expect(parseRecord(null)).toBeNull();
    expect(parseRecord('nope')).toBeNull();
    expect(parseRecord(JSON.stringify({ best: -3, ghost: [] }))).toBeNull();
  });
});
