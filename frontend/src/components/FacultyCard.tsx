import { motion } from "framer-motion";
import { User } from "lucide-react";

interface FacultyCardProps {
  name: string;
  designation: string;
  qualification?: string;
  isLarge?: boolean;
  image?: string;
}

const FacultyCard = ({
  name,
  designation,
  qualification,
  isLarge = false,
  image,
}: FacultyCardProps) => (
  <motion.div
    whileHover={{ y: -6, scale: 1.02 }}
    transition={{ duration: 0.3 }}
    className={`glass-card rounded-2xl overflow-hidden cursor-pointer ${isLarge ? "p-8" : "p-5"}`}
  >
    <div
      className={`rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 overflow-hidden border border-white/20 shadow-md ${
        isLarge ? "w-28 h-28" : "w-16 h-16"
      }`}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <User className={`text-white ${isLarge ? "w-12 h-12" : "w-8 h-8"}`} />
      )}
    </div>
    <h3
      className={`font-heading font-bold text-foreground text-center ${isLarge ? "text-lg" : "text-sm"}`}
    >
      {name}
    </h3>
    <p className="text-primary text-center text-xs font-medium mt-1">
      {designation}
    </p>
    {qualification && (
      <p className="text-muted-foreground text-center text-xs mt-1">
        {qualification}
      </p>
    )}
  </motion.div>
);

export default FacultyCard;
