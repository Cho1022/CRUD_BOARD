export function formatCount(value: number) {
  if (value >= 100000) return "100k";
  if (value >= 10000) return "10k";
  if (value >= 1000) return "1k";
  return String(value);
}
