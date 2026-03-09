import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import FacultyCard from "./FacultyCard";

interface Leader {
  name: string;
  designation: string;
  qualification: string;
  bio: string;
  achievements: string[];
}

const leaders: Leader[] = [
  {
    name: "Dr. Vijaya Gunturu",
    designation: "Principal",
    qualification: "Ph.D.(IIT Roorke), Mtech.",
    bio: "Dr. Vijaya Gunturu serves as the Principal of Sri Venkateswara College of Engineering, Tirupati. With a Ph.D. from IIT Roorkee and over two decades of experience in engineering education, she has been instrumental in establishing SVCE as a leading technical institution in Andhra Pradesh. Her vision focuses on holistic student development, industry-academia collaboration, and fostering innovation through research.",
    achievements: [
      "Established industry partnerships with leading tech companies",
      "Led NAAC accreditation process achieving 'A' grade",
      "Published 45+ research papers in international journals",
      "Initiated skill development programs benefiting 2000+ students",
      "Received 'Best Principal Award' from JNTU Anantapur",
    ],
  },
  {
    name: "Dr.Tharakeshwar A",
    designation: "Vice Principal",
    qualification: "Ph.D.",
    bio: "Dr. Tharakeshwar A is the Vice Principal at SVCE, bringing extensive expertise in academic administration and curriculum development. He oversees the day-to-day academic operations, faculty development programs, and student welfare activities. His leadership has been pivotal in implementing outcome-based education and enhancing the quality of teaching-learning processes across all departments.",
    achievements: [
      "Coordinated NBA accreditation for 6 engineering programs",
      "Implemented innovative teaching methodologies across departments",
      "Mentored 50+ faculty members in research and publications",
      "Organized 20+ national level technical symposiums",
      "Developed industry-oriented curriculum for emerging technologies",
    ],
  },
];

const LeadershipSection = () => {
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);

  useEffect(() => {
    if (selectedLeader) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedLeader]);

  return (
    <section className="section-padding gradient-dark relative overflow-hidden">
      <div className="floating-orb w-80 h-80 bg-primary top-0 right-0" />
      <div
        className="floating-orb w-60 h-60 bg-accent bottom-0 left-10"
        style={{ animationDelay: "4s" }}
      />

      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-primary mb-3 block">
            Leadership
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2">
            Our <span className="text-gradient">Leadership</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {leaders.map((leader, i) => (
            <motion.div
              key={leader.name}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: i * 0.2,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                scale: 1.05,
                y: -10,
                transition: { duration: 0.3 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                setSelectedLeader(
                  selectedLeader?.name === leader.name ? null : leader,
                )
              }
              className="relative cursor-pointer"
            >
              <FacultyCard
                name={leader.name}
                designation={leader.designation}
                qualification={leader.qualification}
                isLarge
              />
            </motion.div>
          ))}
        </div>

        {/* Leader Details - Slides from left */}
        <AnimatePresence>
          {selectedLeader && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLeader(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              {/* Side Panel */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-[90%] sm:w-[450px] bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border-r border-white/10 z-50 overflow-y-auto shadow-2xl"
              >
                {/* Header with Close Button */}
                <div className="sticky top-0 bg-gradient-to-r from-slate-900/95 to-purple-900/95 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                  <h3 className="text-xl font-bold text-white">
                    Leadership Profile
                  </h3>
                  <motion.button
                    onClick={() => setSelectedLeader(null)}
                    className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-red-400 text-xl font-bold">×</span>
                  </motion.button>
                </div>

                <div className="p-6">
                  {/* Profile */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                  >
                    <motion.div
                      className="w-48 h-48 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-6"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      <User className="text-white w-24 h-24" />
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white text-center mb-2">
                      {selectedLeader.name}
                    </h3>
                    <p className="text-primary font-semibold text-center text-lg">
                      {selectedLeader.designation}
                    </p>
                    <p className="text-muted-foreground text-center text-sm">
                      {selectedLeader.qualification}
                    </p>
                  </motion.div>

                  {/* About */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <h4 className="text-xl font-bold text-white mb-3">About</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {selectedLeader.bio}
                    </p>
                  </motion.div>

                  {/* Achievements */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h4 className="text-xl font-bold text-white mb-4">
                      Key Contributions
                    </h4>
                    <div className="space-y-3">
                      {selectedLeader.achievements.map((achievement, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.1 }}
                          className="flex items-start gap-3 bg-white/5 rounded-lg p-3"
                        >
                          <span className="text-primary text-lg flex-shrink-0">
                            ✓
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {achievement}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default LeadershipSection;
