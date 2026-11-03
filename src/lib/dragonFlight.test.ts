import { describe, expect, it } from 'vitest';
import { heightAt, PLACES } from './archiveMap';
import { CEILING, CLEARANCE, EDGE, fly, parseFound, placeInReach, STILL, takeOff, type FlightInput, type Ride } from './dragonFlight';

function hold(input: FlightInput, seconds: number, from: Ride = takeOff()): Ride {
  let ride = from;
  for (let t = 0; t < seconds; t += 1 / 60) ride = fly(ride, input, 1 / 60, heightAt);
  return ride;
}

describe('flying', () => {
  it('takes off over the southern sea, heading north', () => {
    const ride = takeOff();
    expect(heightAt(ride.x, ride.z)).toBeLessThan(0);
    expect(hold(STILL, 2).z).toBeLessThan(ride.z - 10);
  });

  it('turns right when steering right, and banks into the turn', () => {
    const ride = hold({ ...STILL, turn: 1 }, 1);
    expect(ride.heading).toBeLessThan(Math.PI);
    expect(ride.heading).toBeGreaterThan(0);
    expect(ride.bank).toBeGreaterThan(0.3);
  });

  it('climbs and dives', () => {
    const start = takeOff();
    expect(hold({ ...STILL, climb: 1 }, 2).y).toBeGreaterThan(start.y + 5);
    expect(hold({ ...STILL, climb: -1 }, 1).y).toBeLessThan(start.y - 3);
  });

  it('sprints faster with boost', () => {
    expect(hold({ ...STILL, boost: true }, 3).speed).toBeGreaterThan(hold(STILL, 3).speed + 5);
  });

  it('never flies into the ground or above the ceiling', () => {
    let ride = takeOff();
    for (let t = 0; t < 30; t += 1 / 60) {
      ride = fly(ride, { turn: 0.3, climb: -1, boost: true }, 1 / 60, heightAt);
      expect(ride.y).toBeGreaterThanOrEqual(Math.max(heightAt(ride.x, ride.z), 0) + CLEARANCE - 1e-9);
    }
    expect(hold({ ...STILL, climb: 1 }, 30).y).toBeLessThanOrEqual(CEILING);
  });

  it('is turned back toward the island when it strays out to sea', () => {
    // Head straight out south and keep going.
    const outward: Ride = { ...takeOff(), heading: 0, z: EDGE - 5 };
    const ride = hold(STILL, 25, outward);
    expect(Math.hypot(ride.x, ride.z)).toBeLessThan(EDGE + 20);
    expect(hold(STILL, 6, outward).turnedBack || Math.hypot(ride.x, ride.z) < EDGE).toBe(true);
  });
});

describe('placeInReach', () => {
  it('finds the closest place within reach, ignoring height', () => {
    const basgiath = PLACES.find((p) => p.id === 'basgiath')!;
    const ride: Ride = { ...takeOff(), x: basgiath.x + 2, z: basgiath.z, y: 30 };
    expect(placeInReach(ride, PLACES)?.id).toBe('basgiath');
  });

  it('finds nothing out at sea', () => {
    expect(placeInReach(takeOff(), PLACES)).toBeNull();
  });
});

describe('parseFound', () => {
  it('keeps known places once each and drops the rest', () => {
    expect(parseFound(JSON.stringify(['vale', 'vale', 'atlantis', 4]), ['vale', 'aretia'])).toEqual(['vale']);
    expect(parseFound('broken', ['vale'])).toEqual([]);
  });
});
