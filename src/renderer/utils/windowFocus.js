/**
 * Whether the application window itself currently lacks keyboard focus.
 *
 * Inline editors close on blur, but a blur raised because the user switched to
 * another application must not end the edit session: clicking elsewhere inside
 * the app keeps document focus, while the window losing focus does not. See
 * docs/editing.md.
 *
 * @returns {boolean} True while another application holds focus.
 */
export function isWindowUnfocused() {
  return typeof document.hasFocus === 'function' && !document.hasFocus()
}
