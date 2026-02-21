const NIGHT_KEYWORDS = ['NIGHT', 'EVENING', 'DUSK', 'SUNSET'];
const DAY_KEYWORDS = ['DAY', 'MORNING', 'DAWN', 'SUNRISE'];

/**
 * Detect time of day from a slugline string.
 * Uses the last matching keyword in the string (standard sluglines end with time, e.g. "INT. APARTMENT - NIGHT").
 * Returns 'Night', 'Day', or null if no keywords are found.
 */
export function detectTimeOfDay(slugline: string): 'Day' | 'Night' | null {
    const upper = slugline.toUpperCase();

    let lastIndex = -1;
    let result: 'Day' | 'Night' | null = null;

    for (const k of NIGHT_KEYWORDS) {
        const idx = upper.lastIndexOf(k);
        if (idx > lastIndex) {
            lastIndex = idx;
            result = 'Night';
        }
    }
    for (const k of DAY_KEYWORDS) {
        const idx = upper.lastIndexOf(k);
        if (idx > lastIndex) {
            lastIndex = idx;
            result = 'Day';
        }
    }

    return result;
}
