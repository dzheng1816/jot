/**
 * Auto-list: when the user presses Enter after a numbered line like "1. text",
 * auto-insert the next number. If they press Enter on an empty numbered line
 * (double-enter), remove the empty number and revert to normal.
 *
 * Returns { text, handled } — if handled is true, use the returned text
 * instead of the raw input.
 */
export function processAutoList(
  prevText: string,
  newText: string
): { text: string; handled: boolean } {
  // Only act when a newline was just added at the end
  if (
    newText.length <= prevText.length ||
    !newText.endsWith('\n') ||
    prevText.endsWith('\n')
  ) {
    return { text: newText, handled: false };
  }

  const lines = newText.split('\n');
  // The last element is '' (after the trailing \n)
  // The second-to-last is the line the user just finished
  if (lines.length < 2) return { text: newText, handled: false };

  const justFinishedLine = lines[lines.length - 2];

  // Check if the finished line is an empty numbered item: "3. " or "3."
  const emptyMatch = justFinishedLine.match(/^(\d+)\.\s*$/);
  if (emptyMatch) {
    // Double-enter: remove the empty numbered line
    lines.splice(lines.length - 2, 1);
    return { text: lines.join('\n'), handled: true };
  }

  // Check if the finished line starts with a number pattern: "2. some text"
  const numberedMatch = justFinishedLine.match(/^(\d+)\.\s/);
  if (numberedMatch) {
    const nextNum = parseInt(numberedMatch[1], 10) + 1;
    // Insert next number after the newline
    return { text: newText + `${nextNum}. `, handled: true };
  }

  return { text: newText, handled: false };
}
