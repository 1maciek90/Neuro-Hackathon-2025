/**
 * Zwraca kolor na podstawie poziomu koncentracji.
 * @param {number} concentration Poziom koncentracji (0-100).
 * @returns {string} Kod koloru CSS.
 */
export function getConcentrationColor(concentration: number): string {
    if (concentration >= 80) return "rgb(52, 211, 153)"; 
    if (concentration >= 60) return "rgb(251, 191, 36)"; 
    if (concentration >= 40) return "rgb(251, 146, 60)"; 
    return "rgb(248, 113, 113)"; 
}
