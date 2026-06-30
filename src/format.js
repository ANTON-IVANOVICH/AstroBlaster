// 7-digit zero-padded score, matching the HUD mock in the style guide.
export function formatScore(n) {
  const v = Math.max(0, Math.round(n || 0))
  return ('0000000' + v).slice(-7)
}
