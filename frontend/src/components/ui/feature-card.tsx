import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  variant?: "default" | "glass" | "neo";
  size?: "sm" | "md" | "lg";
}

export const FeatureCard = ({
  title,
  description,
  icon: Icon,
  className,
  variant = "default",
  size = "md",
}: FeatureCardProps) => {
  const variants = {
    default: "bg-card border border-border shadow-lg hover:shadow-xl",
    glass: "glass-morphism",
    neo: "neo-card",
  };

  const sizes = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Pulse ring on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="pulse-ring" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg group-hover:shadow-primary/25 transition-shadow duration-300">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="w-12 h-1 bg-gradient-to-r from-primary to-transparent rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};
