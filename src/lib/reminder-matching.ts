/**
 * Check if a reminder rule applies to a given service.
 *
 * Rules:
 * - If rule.serviceIds (JSON array) is set and non-empty, match by that list
 * - Otherwise fall back to legacy rule.serviceId single field
 * - null/empty → applies to all services
 */
export function ruleMatchesService(
  rule: { serviceId?: string | null; serviceIds?: string | null },
  serviceId: string
): boolean {
  // New multi-service field takes precedence
  if (rule.serviceIds) {
    try {
      const ids = JSON.parse(rule.serviceIds) as string[];
      if (Array.isArray(ids) && ids.length > 0) {
        return ids.includes(serviceId);
      }
    } catch {
      // fall through
    }
  }
  // Legacy single-service field
  if (rule.serviceId) {
    return rule.serviceId === serviceId;
  }
  // null on both fields = all services
  return true;
}

/**
 * Parse rule.serviceIds into an array of service IDs.
 * Falls back to [rule.serviceId] if legacy field is set.
 * Returns empty array if rule applies to all services.
 */
export function getRuleServiceIds(rule: { serviceId?: string | null; serviceIds?: string | null }): string[] {
  if (rule.serviceIds) {
    try {
      const ids = JSON.parse(rule.serviceIds) as string[];
      if (Array.isArray(ids)) return ids;
    } catch {
      // fall through
    }
  }
  if (rule.serviceId) return [rule.serviceId];
  return [];
}
