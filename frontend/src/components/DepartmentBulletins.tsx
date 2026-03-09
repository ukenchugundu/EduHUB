import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Award,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Building2,
  User,
  ChevronLeft,
} from "lucide-react";
import FacultyCard from "./FacultyCard";

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

const CountingNumber = ({
  value,
  suffix = "",
  className = "text-lg font-bold text-foreground",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) => {
  const { count, setIsVisible } = useCountUp(value, 5000);

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => setIsVisible(true)}
      viewport={{ once: true }}
    >
      {count.toLocaleString()}
      {suffix}
    </motion.p>
  );
};

const departments = [
  {
    code: "CSE",
    name: "Computer Science & Engineering",
    color: "from-blue-500 to-cyan-500",
    description:
      "Leading the future of technology with cutting-edge research in AI, ML, and software development.",
  },
  {
    code: "CSD",
    name: "Computer Science (Data Science)",
    color: "from-purple-500 to-pink-500",
    description:
      "Transforming data into insights with advanced analytics and machine learning techniques.",
  },
  {
    code: "CSM",
    name: "Computer Science (ML & AI)",
    color: "from-green-500 to-emerald-500",
    description:
      "Pioneering artificial intelligence and machine learning innovations for tomorrow's challenges.",
  },
  {
    code: "CSC",
    name: "Computer Science (Cyber Security)",
    color: "from-red-500 to-orange-500",
    description:
      "Protecting digital assets with advanced cybersecurity research and ethical hacking expertise.",
  },
  {
    code: "IT",
    name: "Information Technology",
    color: "from-indigo-500 to-blue-500",
    description:
      "Building robust IT infrastructure and innovative software solutions for modern enterprises.",
  },
  {
    code: "EEE",
    name: "Electrical & Electronics Engineering",
    color: "from-yellow-500 to-orange-500",
    description:
      "Powering the future with sustainable energy solutions and advanced electrical systems.",
  },
  {
    code: "ME",
    name: "Mechanical Engineering",
    color: "from-gray-500 to-slate-500",
    description:
      "Engineering mechanical systems and manufacturing processes for industrial innovation.",
  },
  {
    code: "CE",
    name: "Civil Engineering",
    color: "from-amber-500 to-yellow-500",
    description:
      "Building sustainable infrastructure and smart cities for future generations.",
  },
  {
    code: "ECE",
    name: "Electronics & Communication Engineering",
    color: "from-violet-500 to-purple-500",
    description:
      "Advancing communication technologies and embedded systems for connected world.",
  },
];

const departmentData: Record<
  string,
  {
    students: number;
    faculty: number;
    labs: number;
    hod: string;
    hodQualification: string;
    established: string;
    hodBio: string;
    hodAchievements: string[];
  }
> = {
  CSE: {
    students: 600,
    faculty: 45,
    labs: 12,
    hod: "Dr. A. Ganesh",
    hodQualification: "Ph.D. in Computer Science & AI",
    established: "1999",
    hodBio:
      "Dr. A. Ganesh is a distinguished computer science educator and researcher with over 20 years of experience in academia. He has been instrumental in establishing the CSE department as a center of excellence in AI and software engineering.",
    hodAchievements: [
      "Led department to NBA accreditation",
      "Published 50+ research papers in AI/ML",
      "Established industry partnerships with top tech companies",
      "Mentored 100+ students in research projects",
      "Received Best HOD Award from JNTU",
    ],
  },
  CSD: {
    students: 180,
    faculty: 18,
    labs: 8,
    hod: "Dr. Keerthipati Kumar",
    hodQualification: "Ph.D. in Data Science",
    established: "2018",
    hodBio:
      "Dr. Keerthipati Kumar is a data science pioneer who established the CSD department with a vision to create industry-ready data scientists. His expertise spans big data analytics, machine learning, and statistical modeling.",
    hodAchievements: [
      "Pioneered Data Science curriculum design",
      "Industry consultant for Fortune 500 companies",
      "Published 35+ papers in data science journals",
      "Established data analytics lab with cutting-edge tools",
      "Trained 500+ students in data science",
    ],
  },
  CSM: {
    students: 120,
    faculty: 15,
    labs: 6,
    hod: "Dr. R. Swathi",
    hodQualification: "Ph.D. in Machine Learning",
    established: "2019",
    hodBio:
      "Dr. R. Swathi is a machine learning expert who leads the CSM department with focus on AI innovation and research. She has extensive experience in deep learning, neural networks, and AI applications.",
    hodAchievements: [
      "AI research lab establishment",
      "Published 40+ ML research papers",
      "Developed 10+ AI applications for industry",
      "Expert in deep learning and neural networks",
      "Received AI Excellence Award",
    ],
  },
  CSC: {
    students: 120,
    faculty: 12,
    labs: 5,
    hod: "Dr. Ch Santhaiah",
    hodQualification: "Ph.D. in Cyber Security",
    established: "2020",
    hodBio:
      "Dr. Ch Santhaiah is a cybersecurity expert who established the CSC department to address the growing need for cybersecurity professionals. His expertise includes network security, ethical hacking, and digital forensics.",
    hodAchievements: [
      "Established cybersecurity lab with advanced tools",
      "Certified ethical hacker and security consultant",
      "Published 25+ papers in cybersecurity",
      "Trained students in ethical hacking",
      "Industry partnerships for security training",
    ],
  },
  IT: {
    students: 240,
    faculty: 28,
    labs: 10,
    hod: "Dr. B. Purushotham",
    hodQualification: "Ph.D. in Information Systems",
    established: "2001",
    hodBio:
      "Dr. B. Purushotham is an IT veteran with extensive experience in information systems, cloud computing, and enterprise architecture. He has been leading the IT department's growth and modernization initiatives.",
    hodAchievements: [
      "Modernized IT curriculum with cloud technologies",
      "Established cloud computing lab",
      "Published 45+ papers in information systems",
      "Industry consultant for IT infrastructure",
      "Led digital transformation initiatives",
    ],
  },
  EEE: {
    students: 180,
    faculty: 22,
    labs: 8,
    hod: "Dr. V Lakshmi Devi",
    hodQualification: "Ph.D. in Power Systems",
    established: "2000",
    hodBio:
      "Dr. V Lakshmi Devi is a power systems expert who has been leading the EEE department's focus on renewable energy and smart grid technologies. Her research contributes to sustainable energy solutions.",
    hodAchievements: [
      "Renewable energy research pioneer",
      "Smart grid technology expert",
      "Published 40+ papers in power systems",
      "Established renewable energy lab",
      "Industry partnerships in power sector",
    ],
  },
  ME: {
    students: 180,
    faculty: 20,
    labs: 7,
    hod: "Dr. M. Chandra Sekhara Reddy",
    hodQualification: "Ph.D. in Thermal Engineering",
    established: "2002",
    hodBio:
      "Dr. M. Chandra Sekhara Reddy is a mechanical engineering expert specializing in thermal systems and manufacturing processes. He has been instrumental in modernizing the ME department with industry 4.0 technologies.",
    hodAchievements: [
      "Industry 4.0 lab establishment",
      "Thermal systems research expert",
      "Published 35+ papers in mechanical engineering",
      "Manufacturing process optimization specialist",
      "Industry partnerships in automotive sector",
    ],
  },
  CE: {
    students: 120,
    faculty: 16,
    labs: 6,
    hod: "Dr. K. Rama Krishna Reddy",
    hodQualification: "Ph.D. in Structural Engineering",
    established: "2003",
    hodBio:
      "Dr. K. Rama Krishna Reddy is a structural engineering expert who leads the CE department's focus on sustainable construction and smart infrastructure. His research contributes to earthquake-resistant design.",
    hodAchievements: [
      "Sustainable construction research leader",
      "Earthquake-resistant design expert",
      "Published 30+ papers in structural engineering",
      "Green building technology advocate",
      "Consultant for major infrastructure projects",
    ],
  },
  ECE: {
    students: 240,
    faculty: 30,
    labs: 9,
    hod: "Dr. D. Srinivasulu Reddy",
    hodQualification: "Ph.D. in VLSI Design",
    established: "2001",
    hodBio:
      "Dr. D. Srinivasulu Reddy is a VLSI design expert who has been leading the ECE department's focus on embedded systems and IoT technologies. His expertise spans chip design to system integration.",
    hodAchievements: [
      "VLSI design lab with advanced EDA tools",
      "IoT and embedded systems expert",
      "Published 45+ papers in VLSI and embedded systems",
      "Chip design consultant for semiconductor companies",
      "Established industry partnerships in electronics sector",
    ],
  },
};

interface Faculty {
  name: string;
  designation: string;
  qualification: string;
  bio: string;
  achievements: string[];
}

const facultyData: Record<string, Faculty[]> = {
  CSE: [
    {
      name: "Prof. R. Lakshmi",
      designation: "Associate Professor",
      qualification: "M.Tech CSE",
      bio: "Prof. R. Lakshmi is an experienced educator with expertise in software engineering and database systems. She has been instrumental in curriculum development and student mentoring.",
      achievements: [
        "Published 15+ research papers",
        "Guided 25+ student projects",
        "Expert in Database Management Systems",
      ],
    },
    {
      name: "Prof. K. Suresh",
      designation: "Assistant Professor",
      qualification: "M.Tech SE",
      bio: "Prof. K. Suresh specializes in software engineering methodologies and agile development practices. He brings industry experience to academic teaching.",
      achievements: [
        "Industry experience of 5 years",
        "Expert in Agile methodologies",
        "Conducted 10+ workshops",
      ],
    },
    {
      name: "Prof. M. Priya",
      designation: "Assistant Professor",
      qualification: "M.Tech CSE",
      bio: "Prof. M. Priya focuses on computer networks and cybersecurity. She is actively involved in research on network security protocols.",
      achievements: [
        "Cybersecurity specialist",
        "Published 8+ papers on network security",
        "Certified ethical hacker",
      ],
    },
    {
      name: "Prof. V. Ravi Kumar",
      designation: "Assistant Professor",
      qualification: "M.Tech AI",
      bio: "Prof. V. Ravi Kumar is passionate about artificial intelligence and machine learning. He leads AI research initiatives in the department.",
      achievements: [
        "AI/ML research expert",
        "Developed 3 AI applications",
        "Mentored 20+ AI projects",
      ],
    },
    {
      name: "Prof. S. Madhavi",
      designation: "Assistant Professor",
      qualification: "M.Tech CSE",
      bio: "Prof. S. Madhavi specializes in web technologies and mobile application development. She has extensive experience in full-stack development.",
      achievements: [
        "Full-stack development expert",
        "Published mobile apps",
        "Conducted coding bootcamps",
      ],
    },
    {
      name: "Prof. N. Rajesh",
      designation: "Assistant Professor",
      qualification: "M.Tech DS",
      bio: "Prof. N. Rajesh is a data science enthusiast with expertise in big data analytics and data visualization techniques.",
      achievements: [
        "Big data analytics expert",
        "Data visualization specialist",
        "Industry consultant",
      ],
    },
  ],
  CSD: [
    {
      name: "Prof. S. Narasimhulu",
      designation: "Associate Professor",
      qualification: "M.Tech DS",
      bio: "Prof. S. Narasimhulu is a data science expert with extensive experience in statistical analysis and predictive modeling.",
      achievements: [
        "Statistical modeling expert",
        "Published 12+ research papers",
        "Industry data science consultant",
      ],
    },
    {
      name: "Prof. M. Sai Kumar",
      designation: "Assistant Professor",
      qualification: "M.Tech ML",
      bio: "Prof. M. Sai Kumar specializes in machine learning algorithms and deep learning frameworks.",
      achievements: [
        "Deep learning specialist",
        "Developed ML models for industry",
        "Expert in TensorFlow and PyTorch",
      ],
    },
    {
      name: "Prof. D. Lavanya",
      designation: "Assistant Professor",
      qualification: "M.Tech DS",
      bio: "Prof. D. Lavanya focuses on data mining and business intelligence solutions.",
      achievements: [
        "Data mining expert",
        "BI solutions developer",
        "Published 8+ papers",
      ],
    },
    {
      name: "Prof. K. Jeevana Sagari",
      designation: "Assistant Professor",
      qualification: "M.Tech DS",
      bio: "Prof. K. Jeevana Sagari is passionate about data visualization and analytics dashboard development.",
      achievements: [
        "Data visualization expert",
        "Dashboard development specialist",
        "Tableau certified",
      ],
    },
    {
      name: "Prof. P. Srinivas",
      designation: "Assistant Professor",
      qualification: "M.Tech Analytics",
      bio: "Prof. P. Srinivas specializes in business analytics and predictive modeling for enterprise solutions.",
      achievements: [
        "Business analytics expert",
        "Predictive modeling specialist",
        "Industry partnerships",
      ],
    },
  ],
  CSM: [
    {
      name: "Prof. L. Swathi",
      designation: "Associate Professor",
      qualification: "M.Tech AI",
      bio: "Prof. L. Swathi is an AI research expert with focus on natural language processing and computer vision.",
      achievements: [
        "NLP research specialist",
        "Computer vision expert",
        "Published 15+ AI papers",
      ],
    },
    {
      name: "Prof. B. Arun",
      designation: "Assistant Professor",
      qualification: "M.Tech ML",
      bio: "Prof. B. Arun specializes in machine learning algorithms and their practical applications in various domains.",
      achievements: [
        "ML algorithm expert",
        "Industry ML consultant",
        "Developed 5+ ML applications",
      ],
    },
    {
      name: "Prof. D. Kavitha",
      designation: "Assistant Professor",
      qualification: "M.Tech DL",
      bio: "Prof. D. Kavitha is passionate about deep learning and neural network architectures.",
      achievements: [
        "Deep learning specialist",
        "Neural network expert",
        "Published DL research",
      ],
    },
    {
      name: "Prof. R. Mohan",
      designation: "Assistant Professor",
      qualification: "M.Tech AI",
      bio: "Prof. R. Mohan focuses on AI applications in robotics and automation systems.",
      achievements: [
        "Robotics AI expert",
        "Automation specialist",
        "IoT integration expert",
      ],
    },
  ],
  CSC: [
    {
      name: "Prof. E. Swetha",
      designation: "Associate Professor",
      qualification: "M.Tech CS",
      bio: "Prof. E. Swetha is a cybersecurity expert with extensive experience in network security and ethical hacking.",
      achievements: [
        "Cybersecurity specialist",
        "Ethical hacking expert",
        "Security consultant",
      ],
    },
    {
      name: "Prof. F. Mohan",
      designation: "Assistant Professor",
      qualification: "M.Tech NS",
      bio: "Prof. F. Mohan specializes in network security protocols and cryptographic systems.",
      achievements: [
        "Network security expert",
        "Cryptography specialist",
        "Security protocol researcher",
      ],
    },
    {
      name: "Prof. G. Pradeep",
      designation: "Assistant Professor",
      qualification: "M.Tech CS",
      bio: "Prof. G. Pradeep focuses on digital forensics and incident response in cybersecurity.",
      achievements: [
        "Digital forensics expert",
        "Incident response specialist",
        "Cybercrime investigator",
      ],
    },
  ],
  IT: [
    {
      name: "Prof. C. Anitha",
      designation: "Associate Professor",
      qualification: "M.Tech IT",
      bio: "Prof. C. Anitha is an IT infrastructure expert with focus on cloud computing and enterprise systems.",
      achievements: [
        "Cloud computing expert",
        "Enterprise systems specialist",
        "AWS certified",
      ],
    },
    {
      name: "Prof. I. Ramesh",
      designation: "Assistant Professor",
      qualification: "M.Tech SE",
      bio: "Prof. I. Ramesh specializes in software engineering and project management methodologies.",
      achievements: [
        "Software engineering expert",
        "Project management specialist",
        "Agile methodology trainer",
      ],
    },
    {
      name: "Prof. O. Divya",
      designation: "Assistant Professor",
      qualification: "M.Tech IT",
      bio: "Prof. O. Divya focuses on database management systems and data warehousing solutions.",
      achievements: [
        "Database expert",
        "Data warehousing specialist",
        "Oracle certified",
      ],
    },
    {
      name: "Prof. T. Venkat",
      designation: "Assistant Professor",
      qualification: "M.Tech Networks",
      bio: "Prof. T. Venkat is a networking expert with expertise in network design and administration.",
      achievements: [
        "Network design expert",
        "Cisco certified",
        "Network security specialist",
      ],
    },
    {
      name: "Prof. U. Sailaja",
      designation: "Assistant Professor",
      qualification: "M.Tech IT",
      bio: "Prof. U. Sailaja specializes in web technologies and mobile application development.",
      achievements: [
        "Web development expert",
        "Mobile app developer",
        "Full-stack specialist",
      ],
    },
  ],
  EEE: [
    {
      name: "Prof. W. Padma",
      designation: "Associate Professor",
      qualification: "M.Tech EEE",
      bio: "Prof. W. Padma is an electrical systems expert with focus on power electronics and control systems.",
      achievements: [
        "Power electronics expert",
        "Control systems specialist",
        "Published 12+ papers",
      ],
    },
    {
      name: "Prof. X. Vinod",
      designation: "Assistant Professor",
      qualification: "M.Tech PS",
      bio: "Prof. X. Vinod specializes in power systems and renewable energy technologies.",
      achievements: [
        "Power systems expert",
        "Renewable energy specialist",
        "Solar energy researcher",
      ],
    },
    {
      name: "Prof. Y. Sushma",
      designation: "Assistant Professor",
      qualification: "M.Tech PE",
      bio: "Prof. Y. Sushma focuses on power electronics and electric drives systems.",
      achievements: [
        "Power electronics specialist",
        "Electric drives expert",
        "Industry consultant",
      ],
    },
    {
      name: "Prof. Z. Krishna",
      designation: "Assistant Professor",
      qualification: "M.Tech EEE",
      bio: "Prof. Z. Krishna is passionate about electrical machines and power system protection.",
      achievements: [
        "Electrical machines expert",
        "Protection systems specialist",
        "Grid integration expert",
      ],
    },
  ],
  ME: [
    {
      name: "Prof. Z. Ravi",
      designation: "Associate Professor",
      qualification: "M.Tech ME",
      bio: "Prof. Z. Ravi is a mechanical engineering expert with focus on manufacturing processes and automation.",
      achievements: [
        "Manufacturing expert",
        "Automation specialist",
        "Industry partnerships",
      ],
    },
    {
      name: "Prof. Q. Sunitha",
      designation: "Assistant Professor",
      qualification: "M.Tech Design",
      bio: "Prof. Q. Sunitha specializes in mechanical design and CAD/CAM technologies.",
      achievements: [
        "Design engineering expert",
        "CAD/CAM specialist",
        "Product design consultant",
      ],
    },
    {
      name: "Prof. A. Bharath",
      designation: "Assistant Professor",
      qualification: "M.Tech Thermal",
      bio: "Prof. A. Bharath focuses on thermal engineering and heat transfer applications.",
      achievements: [
        "Thermal engineering expert",
        "Heat transfer specialist",
        "Energy systems researcher",
      ],
    },
    {
      name: "Prof. B. Lakshmi",
      designation: "Assistant Professor",
      qualification: "M.Tech Production",
      bio: "Prof. B. Lakshmi is passionate about production engineering and quality management systems.",
      achievements: [
        "Production engineering expert",
        "Quality management specialist",
        "Lean manufacturing expert",
      ],
    },
  ],
  CE: [
    {
      name: "Prof. BB. Lavanya",
      designation: "Associate Professor",
      qualification: "M.Tech CE",
      bio: "Prof. BB. Lavanya is a civil engineering expert with focus on structural analysis and design.",
      achievements: [
        "Structural analysis expert",
        "Design consultant",
        "Published 10+ papers",
      ],
    },
    {
      name: "Prof. CC. Sreedhar",
      designation: "Assistant Professor",
      qualification: "M.Tech Geo",
      bio: "Prof. CC. Sreedhar specializes in geotechnical engineering and foundation design.",
      achievements: [
        "Geotechnical expert",
        "Foundation design specialist",
        "Soil mechanics researcher",
      ],
    },
    {
      name: "Prof. DD. Ramya",
      designation: "Assistant Professor",
      qualification: "M.Tech Structural",
      bio: "Prof. DD. Ramya focuses on structural engineering and earthquake-resistant design.",
      achievements: [
        "Structural engineering expert",
        "Seismic design specialist",
        "Building code expert",
      ],
    },
  ],
  ECE: [
    {
      name: "Prof. EE. Rekha",
      designation: "Associate Professor",
      qualification: "M.Tech ECE",
      bio: "Prof. EE. Rekha is an electronics expert with focus on analog and digital circuit design.",
      achievements: [
        "Circuit design expert",
        "Analog electronics specialist",
        "Published 15+ papers",
      ],
    },
    {
      name: "Prof. FF. Kiran",
      designation: "Assistant Professor",
      qualification: "M.Tech Comm",
      bio: "Prof. FF. Kiran specializes in communication systems and signal processing.",
      achievements: [
        "Communication systems expert",
        "Signal processing specialist",
        "Wireless technology researcher",
      ],
    },
    {
      name: "Prof. GG. Shalini",
      designation: "Assistant Professor",
      qualification: "M.Tech VLSI",
      bio: "Prof. GG. Shalini focuses on VLSI design and embedded systems development.",
      achievements: [
        "VLSI design expert",
        "Embedded systems specialist",
        "Chip design consultant",
      ],
    },
    {
      name: "Prof. HH. Suresh",
      designation: "Assistant Professor",
      qualification: "M.Tech ECE",
      bio: "Prof. HH. Suresh is passionate about microprocessors and microcontrollers.",
      achievements: [
        "Microprocessor expert",
        "Embedded programming specialist",
        "IoT developer",
      ],
    },
    {
      name: "Prof. II. Priya",
      designation: "Assistant Professor",
      qualification: "M.Tech Embedded",
      bio: "Prof. II. Priya specializes in embedded systems and real-time operating systems.",
      achievements: [
        "Embedded systems expert",
        "RTOS specialist",
        "IoT solutions developer",
      ],
    },
  ],
};

const DepartmentBulletins = () => {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [selectedFacultyMember, setSelectedFacultyMember] =
    useState<Faculty | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const cardsPerSlide = 3;
  const totalSlides = Math.ceil(departments.length / cardsPerSlide);

  useEffect(() => {
    if (selectedFacultyMember) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedFacultyMember]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isAutoScrollPaused && !selectedDept) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 4000); // Change slide every 4 seconds

      return () => clearInterval(interval);
    }
  }, [isAutoScrollPaused, selectedDept, totalSlides]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentDepartments = () => {
    const start = currentSlide * cardsPerSlide;
    return departments.slice(start, start + cardsPerSlide);
  };

  const selectedDepartment = departments.find((d) => d.code === selectedDept);
  const selectedData = selectedDept ? departmentData[selectedDept] : null;
  const selectedFaculty = selectedDept ? facultyData[selectedDept] || [] : [];

  if (selectedDept && selectedDepartment && selectedData) {
    return (
      <section className="section-padding bg-background relative overflow-hidden">
        <div className="container max-w-6xl relative z-10">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setSelectedDept(null)}
            className="flex items-center gap-2 mb-8 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Departments</span>
          </motion.button>

          {/* Department Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div
              className={`inline-flex px-6 py-3 rounded-full bg-gradient-to-r ${selectedDepartment.color} text-white font-bold text-lg mb-4`}
            >
              {selectedDepartment.code}
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4">
              {selectedDepartment.name}
            </h1>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
              {selectedDepartment.description}
            </p>
          </motion.div>

          {/* Department Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
          >
            <div className="glass-card rounded-2xl p-6 text-center">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedDepartment.color} flex items-center justify-center mx-auto mb-4`}
              >
                <Users className="w-8 h-8 text-white" />
              </div>
              <CountingNumber
                value={selectedData.students}
                suffix="+"
                className="text-2xl font-bold text-foreground"
              />
              <p className="text-muted-foreground text-sm">Students</p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedDepartment.color} flex items-center justify-center mx-auto mb-4`}
              >
                <Award className="w-8 h-8 text-white" />
              </div>
              <CountingNumber
                value={selectedData.faculty}
                className="text-2xl font-bold text-foreground"
              />
              <p className="text-muted-foreground text-sm">Faculty</p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedDepartment.color} flex items-center justify-center mx-auto mb-4`}
              >
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <CountingNumber
                value={selectedData.labs}
                className="text-2xl font-bold text-foreground"
              />
              <p className="text-muted-foreground text-sm">Labs</p>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedDepartment.color} flex items-center justify-center mx-auto mb-4`}
              >
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {selectedData.established}
              </p>
              <p className="text-muted-foreground text-sm">Established</p>
            </div>
          </motion.div>

          {/* HOD Profile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-heading font-bold text-foreground mb-8 text-center">
              Head of Department
            </h2>
            <div className="flex justify-center">
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                onClick={() =>
                  setSelectedFacultyMember({
                    name: selectedData.hod,
                    designation: "Head of Department",
                    qualification: selectedData.hodQualification,
                    bio: selectedData.hodBio,
                    achievements: selectedData.hodAchievements,
                  })
                }
                className="glass-card rounded-3xl p-8 max-w-md text-center cursor-pointer"
              >
                <div
                  className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${selectedDepartment.color} flex items-center justify-center mx-auto mb-6`}
                >
                  <GraduationCap className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">
                  {selectedData.hod}
                </h3>
                <p className="text-primary font-medium mb-2">
                  Head of Department
                </p>
                <p className="text-muted-foreground text-sm">
                  {selectedData.hodQualification}
                </p>
                <p className="text-xs text-primary/60 mt-2">
                  Click to view profile
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Faculty Members */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-2xl font-heading font-bold text-foreground mb-8 text-center">
              Faculty Members
            </h2>
            <div
              className="overflow-hidden"
              onMouseEnter={() => setIsAutoScrollPaused(true)}
              onMouseLeave={() => setIsAutoScrollPaused(false)}
            >
              <motion.div
                className="flex gap-6"
                animate={{
                  x: isAutoScrollPaused ? undefined : [-1600, 0],
                }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 15,
                    ease: "linear",
                  },
                }}
              >
                {/* First set of faculty */}
                {selectedFaculty.map((faculty, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    onClick={() => setSelectedFacultyMember(faculty)}
                    className="flex-shrink-0 w-64"
                  >
                    <FacultyCard
                      name={faculty.name}
                      designation={faculty.designation}
                      qualification={faculty.qualification}
                    />
                  </motion.div>
                ))}

                {/* Duplicate set for seamless loop */}
                {selectedFaculty.map((faculty, index) => (
                  <motion.div
                    key={`${index}-duplicate`}
                    onClick={() => setSelectedFacultyMember(faculty)}
                    className="flex-shrink-0 w-64"
                  >
                    <FacultyCard
                      name={faculty.name}
                      designation={faculty.designation}
                      qualification={faculty.qualification}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Faculty Details Modal */}
          <AnimatePresence>
            {selectedFacultyMember && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedFacultyMember(null)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />

                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 w-[90%] sm:w-[450px] bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 border-r border-white/10 z-50 overflow-y-auto shadow-2xl"
                >
                  <div className="sticky top-0 bg-gradient-to-r from-slate-900/95 to-purple-900/95 backdrop-blur-lg border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="text-xl font-bold text-white">
                      Faculty Profile
                    </h3>
                    <motion.button
                      onClick={() => setSelectedFacultyMember(null)}
                      className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="text-red-400 text-xl font-bold">×</span>
                    </motion.button>
                  </div>

                  <div className="p-6">
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
                        {selectedFacultyMember.name}
                      </h3>
                      <p className="text-primary font-semibold text-center text-lg">
                        {selectedFacultyMember.designation}
                      </p>
                      <p className="text-muted-foreground text-center text-sm">
                        {selectedFacultyMember.qualification}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mb-6"
                    >
                      <h4 className="text-xl font-bold text-white mb-3">
                        About
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {selectedFacultyMember.bio}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h4 className="text-xl font-bold text-white mb-4">
                        Expertise & Achievements
                      </h4>
                      <div className="space-y-3">
                        {selectedFacultyMember.achievements.map(
                          (achievement, idx) => (
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
                          ),
                        )}
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
  }

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      <div className="container max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-primary mb-3 block">
            Departments
          </span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-2">
            Explore Our <span className="text-gradient">Departments</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
            Discover our diverse range of engineering programs with
            state-of-the-art facilities and experienced faculty
          </p>
        </motion.div>

        <div
          className="relative"
          onMouseEnter={() => setIsAutoScrollPaused(true)}
          onMouseLeave={() => setIsAutoScrollPaused(false)}
        >
          {/* Continuous Scrolling Container */}
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{
                x: isAutoScrollPaused ? undefined : [-1920, 0],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 20,
                  ease: "linear",
                },
              }}
            >
              {/* First set of cards */}
              {departments.map((dept, i) => {
                const data = departmentData[dept.code];
                return (
                  <motion.div
                    key={dept.code}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    onHoverStart={() => setHoveredDept(dept.code)}
                    onHoverEnd={() => setHoveredDept(null)}
                    whileHover={{ y: -8 }}
                    onClick={() => setSelectedDept(dept.code)}
                    className="glass-card rounded-2xl p-6 cursor-pointer group relative overflow-hidden flex-shrink-0 w-80"
                  >
                    {/* Gradient overlay on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${dept.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    {/* Department Code Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`px-4 py-2 rounded-lg bg-gradient-to-r ${dept.color} text-white font-bold text-sm`}
                      >
                        {dept.code}
                      </div>
                      <motion.div
                        animate={{ x: hoveredDept === dept.code ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.div>
                    </div>

                    {/* Department Name */}
                    <h3 className="text-lg font-bold text-foreground mb-4 min-h-[3.5rem]">
                      {dept.name}
                    </h3>

                    {/* Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Students
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {data.students}+
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Faculty
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {data.faculty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Labs</p>
                          <p className="text-lg font-bold text-foreground">
                            {data.labs}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* HOD Info */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground mb-1">
                        Head of Department
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {data.hod}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Duplicate set for seamless loop */}
              {departments.map((dept, i) => {
                const data = departmentData[dept.code];
                return (
                  <motion.div
                    key={`${dept.code}-duplicate`}
                    onHoverStart={() => setHoveredDept(dept.code)}
                    onHoverEnd={() => setHoveredDept(null)}
                    whileHover={{ y: -8 }}
                    onClick={() => setSelectedDept(dept.code)}
                    className="glass-card rounded-2xl p-6 cursor-pointer group relative overflow-hidden flex-shrink-0 w-80"
                  >
                    {/* Gradient overlay on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${dept.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    {/* Department Code Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`px-4 py-2 rounded-lg bg-gradient-to-r ${dept.color} text-white font-bold text-sm`}
                      >
                        {dept.code}
                      </div>
                      <motion.div
                        animate={{ x: hoveredDept === dept.code ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.div>
                    </div>

                    {/* Department Name */}
                    <h3 className="text-lg font-bold text-foreground mb-4 min-h-[3.5rem]">
                      {dept.name}
                    </h3>

                    {/* Stats */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Students
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {data.students}+
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Faculty
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {data.faculty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center`}
                        >
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Labs</p>
                          <p className="text-lg font-bold text-foreground">
                            {data.labs}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* HOD Info */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-muted-foreground mb-1">
                        Head of Department
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {data.hod}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DepartmentBulletins;
