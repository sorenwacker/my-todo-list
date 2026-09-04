/**
 * Card width settings for the cards view.
 *
 * The values are minimum widths for the auto-fill card grid, not fixed widths:
 * the grid fits as many columns of at least this width as the window allows and
 * divides the remaining space among them. See docs/cards.md.
 */
export const CARD_MIN_WIDTHS = {
  s: '320px',
  m: '440px',
  l: '600px'
}

export const DEFAULT_CARD_WIDTH = 'm'

/**
 * Reduce a stored or user-supplied size to a known one.
 *
 * @param {string|null} value - Candidate size key.
 * @returns {string} The size key if recognized, otherwise the default.
 */
export function normalizeCardWidth(value) {
  return Object.hasOwn(CARD_MIN_WIDTHS, value) ? value : DEFAULT_CARD_WIDTH
}

/**
 * Resolve a size to the CSS minimum width the card grid uses.
 *
 * @param {string|null} value - Candidate size key.
 * @returns {string} A CSS length, e.g. '440px'.
 */
export function cardMinWidth(value) {
  return CARD_MIN_WIDTHS[normalizeCardWidth(value)]
}
