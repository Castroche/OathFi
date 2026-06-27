export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function clampScore(value: number) {
  return clamp(value, 0, 100);
}

export function normalizeUnit(value: number, min = 0, max = 100) {
  if (max <= min) {
    return 0.05;
  }
  return clamp((value - min) / (max - min), 0.05, 1);
}

export function roundScore(value: number) {
  return Math.round(clampScore(value));
}

export function weightedGeometricMean(inputs: Array<{ value: number; weight: number }>) {
  const totalWeight = inputs.reduce((sum, input) => sum + input.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  const exponent = inputs.reduce((sum, input) => sum + input.weight * Math.log(clamp(input.value, 0.05, 1)), 0);
  return Math.exp(exponent / totalWeight);
}
