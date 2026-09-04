export const DEFAULT_SKELETON_LABEL = "Loading"

export function skeletonRootProps(nested: boolean | undefined, label: string) {
  if (nested) return {}
  return { role: "status" as const, "aria-label": label }
}
