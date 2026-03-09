import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, Award } from "lucide-react";
import { useState, useEffect } from "react";

const useCountUp = (
  end: number,
  duration: number = 5000,
  start: number = 0,
) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * (end - start) + start);

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start, isVisible]);

  return { count, setIsVisible };
};

const stats = [
  {
    icon: GraduationCap,
    label: "Students",
    value: 5000,
    suffix: "+",
    color: "from-primary to-primary/60",
  },
  {
    icon: BookOpen,
    label: "Programs",
    value: 9,
    suffix: "",
    color: "from-accent to-accent/60",
  },
  {
    icon: Users,
    label: "Faculty",
    value: 300,
    suffix: "+",
    color: "from-gold to-gold/60",
  },
  {
    icon: Award,
    label: "Years",
    value: 15,
    suffix: "+",
    color: "from-destructive to-destructive/60",
  },
];

const StatCard = ({
  stat,
  index,
}: {
  stat: (typeof stats)[0];
  index: number;
}) => {
  const { count, setIsVisible } = useCountUp(stat.value, 5000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
      whileInView={{
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
          duration: 0.6,
          delay: index * 0.15,
          type: "spring",
          stiffness: 100,
        },
      }}
      viewport={{ once: true }}
      onViewportEnter={() => setIsVisible(true)}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group glass-card rounded-2xl p-6 text-center cursor-default"
    >
      <motion.div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4`}
        whileHover={{ rotate: 360, scale: 1.2 }}
        transition={{ duration: 0.6 }}
      >
        <stat.icon className="w-7 h-7 text-white" />
      </motion.div>
      <motion.p
        className="text-3xl md:text-4xl font-heading font-bold text-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: index * 0.15 + 0.3 }}
      >
        {count.toLocaleString()}
        {stat.suffix}
      </motion.p>
      <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
    </motion.div>
  );
};

const CollegeInfo = () => (
  <section className="section-padding bg-background relative overflow-hidden">
    <div className="gradient-mesh absolute inset-0" />
    <div className="container max-w-6xl relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-xs font-medium tracking-widest uppercase text-primary mb-3 block">
          About Us
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-6">
          About <span className="text-gradient">SVCE</span>, Tirupati
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-base">
          Sri Venkateswara College of Engineering is a premier institution
          committed to providing quality technical education with
          state-of-the-art infrastructure and experienced faculty.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default CollegeInfo;
