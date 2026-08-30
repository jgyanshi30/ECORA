import { RiskLevel } from "@ecora/shared";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** CLAUDE.md §2/§7: risk palette. HIGH and CRITICAL are both "red" per spec — kept
 * as one hue, differentiated only by intensity/weight so they still read as distinct. */
const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-green-100 text-green-800 border-green-200" },
  MEDIUM: { label: "Medium", className: "bg-amber-100 text-amber-800 border-amber-200" },
  HIGH: { label: "High", className: "bg-red-100 text-red-800 border-red-200" },
  CRITICAL: { label: "Critical", className: "bg-red-200 text-red-900 border-red-300 font-semibold" },
};

export interface RiskBadgeProps {
  level: RiskLevel;
  /**
   * CLAUDE.md §0: AI results are never presented as confirmed fact to end
   * users — only an admin's verified risk is authoritative, and even then the
   * UI must distinguish AI-suggested vs. admin-verified values. Required
   * (not optional/defaulted) so every call site has to make this call
   * explicitly rather than silently implying a value is confirmed.
   */
  source: "ai" | "admin";
  className?: string;
}

/** One RiskBadge for both citizen and admin surfaces (CLAUDE.md §12) — never fork per-role variants. */
export function RiskBadge({ level, source, className }: RiskBadgeProps) {
  const config = RISK_CONFIG[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge variant="outline" className={config.className}>
        {config.label} risk
      </Badge>
      <span className="text-xs text-muted-foreground">
        {source === "ai" ? "AI-suggested" : "Admin-verified"}
      </span>
    </span>
  );
}
