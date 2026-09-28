/** Kit tint per team: your team keeps the club kit; opponents ride in their own colour. */
const TINTS: Record<string, { kit: string; helmet: string }> = {
  own: { kit: "#ffffff", helmet: "#004653" },
  z1: { kit: "#f08a5d", helmet: "#b8452a" },
  z2: { kit: "#8ec5ff", helmet: "#2f5f9e" },
  z3: { kit: "#c7a6f5", helmet: "#6541a3" },
  z4: { kit: "#9ee6a3", helmet: "#2f7d3c" },
  z5: { kit: "#ffe08a", helmet: "#a3801f" },
};
/** Ladder opponents (t1–t9) all wear the first opponent colour: there is only one. */
export function teamTint(team: string | null) {
  if (!team) return TINTS.own;
  return TINTS[team] ?? TINTS.z1;
}
