export function getConcentrationColor(value: number): string {
	const hue = (value * 120) / 100;
	return `hsl(${hue}, 100%, 50%)`;
}
