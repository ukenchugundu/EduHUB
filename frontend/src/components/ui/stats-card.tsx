import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  className?: string;
  gradient?: "primary" | "accent" | "success" | "warning";
}

const gradients = {
  primary: "from-violet-500 to-purple-600",
  accent: "from-cyan-500 to-blue-600",
  success: "from-green-500 to-emerald-600",
  warning: "from-yellow-500 to-orange-600",
};

export const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  className,
  gradient = "primary",
}: StatsCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative p-6 rounded-2xl glass-morphism border border-white/10 overflow-hidden group",
        className,
      )}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-300",
          gradients[gradient],
        )}
      />

      {/* Floating orb */}
      <div
        className={cn(
          "absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br rounded-full opacity-10 blur-2xl",
          gradients[gradient],
        )}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "p-3 rounded-xl bg-gradient-to-br shadow-lg",
              gradients[gradient],
            )}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                change.type === "increase"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              )}
            >
              <span>{change.type === "increase" ? "↗" : "↘"}</span>
              {Math.abs(change.value)}%
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </motion.div>
  );
};
