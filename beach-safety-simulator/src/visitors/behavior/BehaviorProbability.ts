/**
 * Utility functions for evaluating probabilistic decisions for visitors.
 */
export class BehaviorProbability {
  /**
   * Evaluates if a probabilistic event occurs given a base probability [0, 1]
   * and an optional modifier factor.
   */
  public static roll(probability: number, modifier: number = 1.0): boolean {
    const effectiveProb = Math.min(1.0, Math.max(0.0, probability * modifier));
    return Math.random() < effectiveProb;
  }

  /**
   * Generates a random number with gaussian/normal distribution
   */
  public static randomGaussian(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + num * stdDev;
  }

  /**
   * Clamps a value between min and max
   */
  public static clamp(val: number, min: number = 0.0, max: number = 1.0): number {
    return Math.min(max, Math.max(min, val));
  }
}
