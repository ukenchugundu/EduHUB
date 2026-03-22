import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, ArrowRight, X, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "@/lib/apiUrl";

interface EventData {
  id?: number;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  category?: string;
  status?: string;
  image_url?: string | null;
  max_participants?: number | null;
}

const DEFAULT_EVENTS: EventData[] = [
  {
    title: "Annual Tech Fest - Innovista 2026",
    event_date: "2026-03-15T09:00:00.000Z",
    location: "Main Auditorium",
    category: "Tech Fest",
    status: "upcoming",
    description:
      "Join us for the biggest tech festival of the year featuring competitions, workshops, and guest speakers from leading tech companies.",
  },
  {
    title: "National Level Hackathon",
    event_date: "2026-03-22T09:00:00.000Z",
    location: "CS Block Lab",
    category: "Hackathon",
    status: "upcoming",
    description:
      "A 24-hour coding marathon where teams compete to build innovative solutions. Prizes worth ₹50,000!",
  },
  {
    title: "Guest Lecture: AI in Healthcare",
    event_date: "2026-03-28T14:00:00.000Z",
    location: "Seminar Hall",
    category: "Seminar",
    status: "upcoming",
    description:
      "Learn from industry experts about the revolutionary applications of Artificial Intelligence in modern healthcare.",
  },
  {
    title: "Sports Day 2026",
    event_date: "2026-04-05T08:00:00.000Z",
    location: "Sports Ground",
    category: "Sports",
    status: "upcoming",
    description:
      "Annual sports day featuring athletics, team sports, and fun activities for all students and faculty.",
  },
];

const formatEventDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatEventTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getEventTag = (event: EventData) => {
  return event.category || event.status || "Event";
};

const getEventGradient = (event: EventData) => {
  const tag = getEventTag(event).toLowerCase();
  if (tag.includes("hackathon")) return "from-accent to-accent/60";
  if (tag.includes("tech")) return "from-primary to-primary/60";
  if (tag.includes("seminar")) return "from-gold to-gold/60";
  if (tag.includes("sports")) return "from-destructive to-destructive/60";
  if (tag.includes("conference")) return "from-indigo to-indigo/60";
  return "from-primary to-primary/60";
};

const UpcomingEvents = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(buildApiUrl("/api/events"), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load events (${response.status})`);
        }
        const data = (await response.json()) as EventData[];
        if (Array.isArray(data)) {
          setEvents(data);
        }
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError(
            err instanceof Error ? err.message : "Failed to load upcoming events",
          );
          setEvents(DEFAULT_EVENTS);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
    return () => controller.abort();
  }, []);

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const handleLoginClick = () => {
    if (selectedEvent) {
      // TODO: Replace selectedEvent.title with a unique event ID when available
      navigate(
        `/auth?redirect=/student/quizzes/${encodeURIComponent(
          selectedEvent.title,
        )}`,
      );
    }
  };

  return (
    <>
      <section className="section-padding bg-secondary/30 relative overflow-hidden">
        <div className="container max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-primary mb-3 block">
              What's Coming
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
              Upcoming <span className="text-gradient">Events</span>
            </h2>
          </motion.div>
          {error && (
            <div className="glass-card rounded-xl p-4 mb-6 bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
                  <div className="h-6 bg-secondary rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-secondary rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                No upcoming events
              </h3>
              <p className="text-sm text-muted-foreground">
                Check back later or ask an admin to add an event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group glass-card rounded-2xl p-6 card-hover cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getEventGradient(event)}`}
                    >
                      {getEventTag(event)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-lg mb-3">
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" /> {formatEventDate(event.event_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {formatEventTime(event.event_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />{" "}
                      {event.location}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-card rounded-2xl overflow-hidden"
            >
              <div
                className={`h-32 bg-gradient-to-r ${selectedEvent.color} relative`}
              >
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-background/20 backdrop-blur-sm text-white hover:bg-background/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 -mt-12 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${selectedEvent.color} text-white`}
                  >
                    {selectedEvent.tag}
                  </span>
                </div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                  {selectedEvent.title}
                </h2>
                {selectedEvent.description && (
                  <p className="text-muted-foreground mb-6">
                    {selectedEvent.description}
                  </p>
                )}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLoginClick}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/60 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <LogIn className="w-4 h-4" />
                  Login to Register
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UpcomingEvents;
