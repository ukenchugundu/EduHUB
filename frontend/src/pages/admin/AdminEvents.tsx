import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  max_participants: number | null;
  image_url: string | null;
  category: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  registered_count?: number;
  is_registered?: boolean;
}

interface Registration {
  id: number;
  event_id: number;
  user_id: number;
  registered_at: string;
  full_name: string;
  email: string;
  role: string;
}

const fetchEvents = async (signal?: AbortSignal): Promise<Event[]> => {
  const authData = localStorage.getItem("eduhub_auth");
  const token = authData ? JSON.parse(authData).token : null;
  const response = await fetch(`${API_BASE}/api/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }
  return response.json();
};

const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  const authData = localStorage.getItem("eduhub_auth");
  const token = authData ? JSON.parse(authData).token : null;
  const response = await fetch(`${API_BASE}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create event");
  }
  return response.json();
};

const updateEvent = async (
  id: number,
  eventData: Partial<Event>,
): Promise<Event> => {
  const authData = localStorage.getItem("eduhub_auth");
  const token = authData ? JSON.parse(authData).token : null;
  const response = await fetch(`${API_BASE}/api/events/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update event");
  }
  return response.json();
};

const deleteEvent = async (id: number): Promise<void> => {
  const authData = localStorage.getItem("eduhub_auth");
  const token = authData ? JSON.parse(authData).token : null;
  const response = await fetch(`${API_BASE}/api/events/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete event");
  }
};

const getEventRegistrations = async (
  eventId: number,
): Promise<Registration[]> => {
  const authData = localStorage.getItem("eduhub_auth");
  const token = authData ? JSON.parse(authData).token : null;
  const response = await fetch(
    `${API_BASE}/api/events/${eventId}/registrations`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch registrations");
  }
  return response.json();
};

const AdminEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    location: "",
    maxParticipants: "",
    imageUrl: "",
    category: "Conference",
    status: "upcoming",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setIsEditing(true);
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        eventDate: event.event_date
          ? new Date(event.event_date).toISOString().slice(0, 16)
          : "",
        location: event.location || "",
        maxParticipants: event.max_participants?.toString() || "",
        imageUrl: event.image_url || "",
        category: event.category || "Conference",
        status: event.status || "upcoming",
      });
    } else {
      setIsEditing(false);
      setSelectedEvent(null);
      setFormData({
        title: "",
        description: "",
        eventDate: "",
        location: "",
        maxParticipants: "",
        imageUrl: "",
        category: "Conference",
        status: "upcoming",
      });
    }
    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventDate: new Date(formData.eventDate).toISOString(),
        location: formData.location,
        maxParticipants: formData.maxParticipants
          ? parseInt(formData.maxParticipants)
          : null,
        imageUrl: formData.imageUrl || null,
        category: formData.category,
        status: formData.status,
      };

      if (isEditing && selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }

      handleCloseModal();
      loadEvents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await deleteEvent(id);
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  const handleViewRegistrations = async (event: Event) => {
    setSelectedEvent(event);
    setLoadingRegistrations(true);
    setShowRegistrationsModal(true);

    try {
      const data = await getEventRegistrations(event.id);
      setRegistrations(data);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to load registrations",
      );
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleViewEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500/20 text-blue-400";
      case "ongoing":
        return "bg-green-500/20 text-green-400";
      case "completed":
        return "bg-gray-500/20 text-gray-400";
      case "cancelled":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Tech Fest":
        return "from-primary to-primary/60";
      case "Hackathon":
        return "from-accent to-accent/60";
      case "Seminar":
        return "from-gold to-gold/60";
      case "Sports":
        return "from-destructive to-destructive/60";
      case "Workshop":
        return "from-purple-500 to-purple-500/60";
      default:
        return "from-gray-500 to-gray-500/60";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Events Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Create and manage campus events
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/60 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/60 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card rounded-xl p-4 bg-destructive/10 border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-secondary rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-secondary rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
              No events found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? "Try a different search term"
                : "Create your first event to get started"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => handleViewEventDetails(event)}
              >
                {/* Event Image */}
                <div
                  className={`h-32 bg-gradient-to-r ${getCategoryColor(event.category)} relative`}
                >
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>

                {/* Event Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${getCategoryColor(event.category)} text-white`}
                    >
                      {event.category}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-foreground text-lg mb-2 line-clamp-2">
                    {event.title}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{formatTime(event.event_date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{event.registered_count || 0} registered</span>
                      {event.max_participants && (
                        <span className="text-xs">
                          / {event.max_participants} max
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <button
                      onClick={() => handleViewRegistrations(event)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-secondary text-foreground hover:bg-secondary/70 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleOpenModal(event)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
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
              className="w-full max-w-lg glass-card rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  {isEditing ? "Edit Event" : "Create New Event"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm text-destructive">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="Enter event description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.eventDate}
                      onChange={(e) =>
                        setFormData({ ...formData, eventDate: e.target.value })
                      }
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="Conference">Conference</option>
                      <option value="Tech Fest">Tech Fest</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Seminar">Seminar</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Sports">Sports</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Enter location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxParticipants: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/60 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting
                      ? "Saving..."
                      : isEditing
                        ? "Update Event"
                        : "Create Event"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registrations Modal */}
      <AnimatePresence>
        {showRegistrationsModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowRegistrationsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-card rounded-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    Event Registrations
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowRegistrationsModal(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{registrations.length} registered</span>
                </div>
                {selectedEvent.max_participants && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {selectedEvent.max_participants - registrations.length}{" "}
                      spots left
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingRegistrations ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-secondary rounded-xl animate-pulse"
                      ></div>
                    ))}
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No registrations yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrations.map((registration) => (
                      <div
                        key={registration.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {registration.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {registration.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {registration.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              registration.role === "student"
                                ? "bg-primary/20 text-primary"
                                : "bg-accent/20 text-accent"
                            }`}
                          >
                            {registration.role}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              registration.registered_at,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventDetailsModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowEventDetailsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden"
            >
              {/* Event Image */}
              <div
                className={`h-48 bg-gradient-to-r ${getCategoryColor(selectedEvent.category)} relative`}
              >
                {selectedEvent.image_url && (
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(selectedEvent.status)}`}
                  >
                    {selectedEvent.status}
                  </span>
                </div>
                <button
                  onClick={() => setShowEventDetailsModal(false)}
                  className="absolute top-4 left-4 p-2 rounded-lg bg-background/20 backdrop-blur-sm text-white hover:bg-background/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Event Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${getCategoryColor(selectedEvent.category)} text-white`}
                  >
                    {selectedEvent.category}
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

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(selectedEvent.event_date)}
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
                        {formatTime(selectedEvent.event_date)}
                      </p>
                    </div>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Location
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedEvent.location}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.registered_count || 0} /{" "}
                        {selectedEvent.max_participants || "Unlimited"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <button
                    onClick={() => {
                      setShowEventDetailsModal(false);
                      handleViewRegistrations(selectedEvent);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/60 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    <Eye className="w-4 h-4" />
                    View Registrations
                  </button>
                  <button
                    onClick={() => {
                      setShowEventDetailsModal(false);
                      handleOpenModal(selectedEvent);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Event
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminEvents;
