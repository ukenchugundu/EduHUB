import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import HeroSlideshow from "@/components/HeroSlideshow";
import CollegeInfo from "@/components/CollegeInfo";
import LeadershipSection from "@/components/LeadershipSection";
import DepartmentBulletins from "@/components/DepartmentBulletins";
import UpcomingEvents from "@/components/UpcomingEvents";
import Footer from "@/components/Footer";

const PreLogin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 relative">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-r from-indigo-600/15 to-blue-600/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

        {/* Floating particles */}
        <div
          className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-ping"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-3/4 right-1/3 w-1 h-1 bg-purple-400/30 rounded-full animate-ping"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-indigo-400/25 rounded-full animate-ping"
          style={{ animationDelay: "2.5s" }}
        />
      </div>

      {/* Enhanced Sticky Navbar */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-2xl"
      >
        <div className="container max-w-6xl flex items-center justify-between px-6 py-4 relative">
          {/* Enhanced logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-500/30 border border-white/20">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
              <GraduationCap className="w-6 h-6 text-white drop-shadow-lg" />
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 opacity-30 blur-sm animate-pulse" />
            </div>
            <span className="font-brand font-bold text-white text-2xl bg-gradient-to-r from-white via-purple-100 to-indigo-100 bg-clip-text text-transparent">
              EduHub
            </span>
          </motion.div>

          {/* Enhanced login button */}
          <motion.button
            onClick={() => navigate("/auth")}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-sm hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 relative overflow-hidden group border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-center gap-2.5">
              <LogIn className="w-4 h-4" />
              Login
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </motion.button>
        </div>
      </motion.nav>

      <div className="relative z-10">
        <HeroSlideshow />
        <CollegeInfo />
        <LeadershipSection />
        <DepartmentBulletins />
        <UpcomingEvents />
        <Footer />
      </div>
    </div>
  );
};

export default PreLogin;
