import { useState, useEffect } from "react";
import FacultyLayout from "@/components/FacultyLayout";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Target,
  AlertTriangle,
  BookOpen,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import {
  STUDENT_DATA,
  getSectionStats,
  getTopPerformers,
  getLowPerformers,
} from "@/data/studentData";

const FacultyAnalytics = () => {
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState("literacy_percentage");

  const sections = [...new Set(STUDENT_DATA.map((s) => s.section))];

  const filteredData =
    selectedSection === "all"
      ? STUDENT_DATA
      : STUDENT_DATA.filter((s) => s.section === selectedSection);

  const overallStats = {
    total: STUDENT_DATA.length,
    avgLiteracy:
      STUDENT_DATA.reduce((sum, s) => sum + s.literacy_percentage, 0) /
      STUDENT_DATA.length,
    avgAttendance:
      STUDENT_DATA.reduce((sum, s) => sum + s.attendance, 0) /
      STUDENT_DATA.length,
    avgQuiz:
      STUDENT_DATA.reduce((sum, s) => sum + s.quiz_score, 0) /
      STUDENT_DATA.length,
    avgAssessment:
      STUDENT_DATA.reduce((sum, s) => sum + s.assessment_score, 0) /
      STUDENT_DATA.length,
    avgInteraction:
      STUDENT_DATA.reduce((sum, s) => sum + s.interaction_score, 0) /
      STUDENT_DATA.length,
    high: STUDENT_DATA.filter((s) => s.literacy_level === "High").length,
    medium: STUDENT_DATA.filter((s) => s.literacy_level === "Medium").length,
    low: STUDENT_DATA.filter((s) => s.literacy_level === "Low").length,
  };

  const sectionAnalytics = sections.map((section) => ({
    section,
    ...getSectionStats(section),
  }));

  const topPerformers = getTopPerformers(5);
  const lowPerformers = getLowPerformers(5);

  const performanceDistribution = [
    {
      level: "High",
      count: overallStats.high,
      color: "bg-green-500",
      percentage: (overallStats.high / overallStats.total) * 100,
    },
    {
      level: "Medium",
      count: overallStats.medium,
      color: "bg-yellow-500",
      percentage: (overallStats.medium / overallStats.total) * 100,
    },
    {
      level: "Low",
      count: overallStats.low,
      color: "bg-red-500",
      percentage: (overallStats.low / overallStats.total) * 100,
    },
  ];

  const attendanceRanges = [
    {
      range: "90-100%",
      count: STUDENT_DATA.filter((s) => s.attendance >= 90).length,
      color: "bg-green-500",
    },
    {
      range: "80-89%",
      count: STUDENT_DATA.filter((s) => s.attendance >= 80 && s.attendance < 90)
        .length,
      color: "bg-blue-500",
    },
    {
      range: "70-79%",
      count: STUDENT_DATA.filter((s) => s.attendance >= 70 && s.attendance < 80)
        .length,
      color: "bg-yellow-500",
    },
    {
      range: "60-69%",
      count: STUDENT_DATA.filter((s) => s.attendance >= 60 && s.attendance < 70)
        .length,
      color: "bg-orange-500",
    },
    {
      range: "Below 60%",
      count: STUDENT_DATA.filter((s) => s.attendance < 60).length,
      color: "bg-red-500",
    },
  ];

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive student performance analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border/70 bg-background/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {overallStats.total}
            </h3>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {overallStats.avgLiteracy.toFixed(1)}%
            </h3>
            <p className="text-sm text-muted-foreground">Avg Literacy Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {overallStats.avgAttendance.toFixed(1)}%
            </h3>
            <p className="text-sm text-muted-foreground">Avg Attendance</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {overallStats.high}
            </h3>
            <p className="text-sm text-muted-foreground">High Performers</p>
          </motion.div>
        </div>

        {/* Performance Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Performance Level Distribution
          </h3>
          <div className="space-y-4">
            {performanceDistribution.map((item, index) => (
              <div key={item.level} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-foreground">
                  {item.level}
                </div>
                <div className="flex-1 bg-secondary rounded-full h-8 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                    className={`h-full ${item.color} flex items-center justify-end pr-3`}
                  >
                    <span className="text-white text-sm font-medium">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Section-wise Performance Comparison
          </h3>
          <div className="space-y-4">
            {sectionAnalytics.map((section, index) => (
              <motion.div
                key={section.section}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-4 rounded-xl border border-border/50 hover:bg-secondary/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-foreground">
                    {section.section}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    {section.total} students
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Avg Literacy</p>
                    <p className="font-semibold text-foreground">
                      {section.avgLiteracy.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Avg Attendance</p>
                    <p className="font-semibold text-foreground">
                      {section.avgAttendance.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">High Performers</p>
                    <p className="font-semibold text-green-600">
                      {section.high}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Need Support</p>
                    <p className="font-semibold text-red-600">{section.low}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top and Low Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {topPerformers.map((student, index) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {student.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.student_id} • {student.section}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {student.literacy_percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Literacy Rate
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Students Needing Support
            </h3>
            <div className="space-y-3">
              {lowPerformers.map((student, index) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {student.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.student_id} • {student.section}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {student.literacy_percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Literacy Rate
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Attendance Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance Distribution
          </h3>
          <div className="space-y-4">
            {attendanceRanges.map((range, index) => (
              <div key={range.range} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-foreground">
                  {range.range}
                </div>
                <div className="flex-1 bg-secondary rounded-full h-8 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(range.count / overallStats.total) * 100}%`,
                    }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.8 }}
                    className={`h-full ${range.color} flex items-center justify-end pr-3`}
                  >
                    <span className="text-white text-sm font-medium">
                      {range.count} (
                      {((range.count / overallStats.total) * 100).toFixed(1)}%)
                    </span>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </FacultyLayout>
  );
};

export default FacultyAnalytics;
