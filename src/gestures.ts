import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type HandState = { landmarks: NormalizedLandmark[]; fingers: number; pinching: boolean };

const FINGER_JOINTS = [[8, 6], [12, 10], [16, 14], [20, 18]] as const;

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function countFingers(points: NormalizedLandmark[]): number {
  if (points.length < 21) return 0;
  let count = 0;
  for (const [tip, middle] of FINGER_JOINTS) {
    if (distance(points[tip], points[0]) > distance(points[middle], points[0]) * 1.12) count++;
  }
  const thumbOpen = distance(points[4], points[17]) > distance(points[3], points[17]) * 1.12;
  return count + Number(thumbOpen);
}

export function isPinching(points: NormalizedLandmark[], previous: boolean): boolean {
  if (points.length < 21) return false;
  const width = Math.max(distance(points[5], points[17]), 0.01);
  const ratio = distance(points[4], points[8]) / width;
  return ratio < (previous ? 0.48 : 0.35);
}

export class StableSelection {
  private candidate = 0;
  private since = 0;
  private selected = 0;

  update(value: number, now: number): number {
    if (value !== this.candidate) {
      this.candidate = value;
      this.since = now;
    }
    if (value > 0 && now - this.since >= 180) this.selected = value;
    return this.selected;
  }

  reset(): void {
    this.candidate = 0;
    this.since = 0;
    this.selected = 0;
  }
}
