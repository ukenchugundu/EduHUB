import { useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PortalRole } from "@/lib/authSession";

type AgentMessage = {
  sender: "assistant" | "user";
  text: string;
};

type QuickAction = {
  label: string;
  prompt: string;
};

type AgentIntent = {
  keywords: string[];
  response: string;
};

type AgentConfig = {
  title: string;
  subtitle: string;
  accentClassName: string;
  placeholder: string;
  welcome: string;
  quickActions: QuickAction[];
  intents: AgentIntent[];
  fallback: string;
};

export const EDUHUB_AI_DISABLED_MESSAGE =
  "AI assistance is disabled while completing assignments or exams.";

const AGENT_CONFIG: Record<PortalRole, AgentConfig> = {
  admin: {
    title: "EduHub Admin AI Agent",
    subtitle: "Admin guidance for users, timetable, marks, and events",
    accentClassName: "from-amber-500 to-orange-500",
    placeholder: "Ask about user management, timetable setup, marks, or events...",
    welcome:
      "I can guide you through EduHub admin work with simple step-by-step instructions.",
    quickActions: [
      { label: "Create users", prompt: "How do I create a user account?" },
      { label: "Build timetable", prompt: "How do I create the timetable?" },
      { label: "View marks", prompt: "How do I check marks?" },
    ],
    intents: [
      {
        keywords: ["user", "users", "create", "faculty", "student", "admin"],
        response:
          "Step 1 → Open Dashboard.\nStep 2 → Select Manage Users from the left menu.\nStep 3 → Choose the role you want to create or review.\nStep 4 → Fill in the required account details.\nStep 5 → Save the record and confirm the user appears in the list.",
      },
      {
        keywords: ["schedule", "timetable", "class", "slot"],
        response:
          "Step 1 → Open Create Schedule.\nStep 2 → Choose the batch or class.\nStep 3 → Click the correct timetable slot in the weekly grid.\nStep 4 → Add faculty, subject, topic, and room details.\nStep 5 → Save the slot so it appears in the preview and reaches faculty and student schedules.",
      },
      {
        keywords: ["marks", "results", "score"],
        response:
          "Step 1 → Open View Marks from the admin menu.\nStep 2 → Choose the class, exam, or record you want to review.\nStep 3 → Check the displayed marks summary.\nStep 4 → Open detailed records if you need student-level results.\nStep 5 → Use the page again whenever you need progress verification.",
      },
      {
        keywords: ["event", "events", "notice", "announcement"],
        response:
          "Step 1 → Open Events in the admin portal.\nStep 2 → Review existing event entries.\nStep 3 → Add or update the event information.\nStep 4 → Save the event details carefully.\nStep 5 → Recheck the event list to confirm students and faculty can see the update.",
      },
      {
        keywords: ["history", "activity", "report"],
        response:
          "Step 1 → Open History from the admin sidebar.\nStep 2 → Review the latest platform activity records.\nStep 3 → Filter the entries you need to inspect.\nStep 4 → Compare the details with the related user or schedule action.\nStep 5 → Return to the source page if a follow-up change is needed.",
      },
    ],
    fallback:
      "I can help only with EduHub admin tasks.\nStep 1 → Ask about users, timetable, events, marks, or history.\nStep 2 → Mention the page or action you want to complete.\nStep 3 → I will give you simple EduHub steps.",
  },
  faculty: {
    title: "EduHub Faculty AI Agent",
    subtitle: "Faculty guidance for teaching, notes, assignments, and marks",
    accentClassName: "from-emerald-500 to-teal-500",
    placeholder: "Ask about notes, assignments, attendance, schedule, or marks...",
    welcome:
      "I can help you use EduHub teaching tools with clear step-by-step guidance.",
    quickActions: [
      { label: "Upload notes", prompt: "How do I upload notes?" },
      { label: "Manage assignments", prompt: "How do I manage assignments?" },
      { label: "Upload marks", prompt: "How do I upload marks?" },
    ],
    intents: [
      {
        keywords: ["note", "notes", "material", "upload"],
        response:
          "Step 1 → Open Notes from the faculty menu.\nStep 2 → Choose the class or subject you want to support.\nStep 3 → Upload or add the study material details.\nStep 4 → Save the note entry.\nStep 5 → Confirm the note is visible for students.",
      },
      {
        keywords: ["assignment", "assignments", "task", "submission"],
        response:
          "Step 1 → Open Task Management or Assignments.\nStep 2 → Create a new assignment or review existing submissions.\nStep 3 → Add the title, class, instructions, and deadline.\nStep 4 → Save the assignment and monitor student submissions.\nStep 5 → Return to the submissions area to review or grade the work.",
      },
      {
        keywords: ["attendance", "present", "absent"],
        response:
          "Step 1 → Open Attendance from the faculty sidebar.\nStep 2 → Select the class and session details.\nStep 3 → Mark students as present or absent.\nStep 4 → Save the attendance record.\nStep 5 → Reopen the page if you need to verify the saved entry.",
      },
      {
        keywords: ["schedule", "timetable", "class", "command"],
        response:
          "Step 1 → Open Schedule in the faculty portal.\nStep 2 → Review today’s or upcoming timetable entries.\nStep 3 → Check the class, subject, room, and topic information.\nStep 4 → Use the timetable details to prepare notes or tasks.\nStep 5 → Return to the page anytime you need your next session details.",
      },
      {
        keywords: ["mark", "marks", "score", "grade"],
        response:
          "Step 1 → Open Upload Marks.\nStep 2 → Choose the relevant class or assessment.\nStep 3 → Enter the student scores carefully.\nStep 4 → Submit the marks update.\nStep 5 → Recheck the list to confirm the scores were saved.",
      },
    ],
    fallback:
      "I can help only with EduHub faculty tasks.\nStep 1 → Ask about notes, assignments, attendance, schedule, or marks.\nStep 2 → Mention what you want to do in the portal.\nStep 3 → I will respond with simple teaching-focused steps.",
  },
  student: {
    title: "EduHub Student AI Agent",
    subtitle: "Student guidance for navigation, study support, and submissions",
    accentClassName: "from-blue-500 to-violet-500",
    placeholder: "Ask about timetable, notes, assignments, quizzes, or results...",
    welcome:
      "I can help you navigate EduHub and find academic resources, but only within platform support.",
    quickActions: [
      { label: "Open timetable", prompt: "How do I check my schedule?" },
      { label: "Find notes", prompt: "How do I open my notes?" },
      { label: "Check results", prompt: "How do I view my results?" },
    ],
    intents: [
      {
        keywords: ["schedule", "timetable", "class", "dashboard"],
        response:
          "Step 1 → Open My Insights from the student menu.\nStep 2 → Review your timetable or upcoming class section.\nStep 3 → Check the subject, room, and time details.\nStep 4 → Return to the dashboard whenever you need the latest class plan.",
      },
      {
        keywords: ["note", "notes", "material", "study"],
        response:
          "Step 1 → Open Notes from the student sidebar.\nStep 2 → Choose the subject you want to study.\nStep 3 → Open the uploaded material.\nStep 4 → Review the content for academic preparation.\nStep 5 → Return to Notes whenever new material is shared.",
      },
      {
        keywords: ["assignment", "submit", "homework"],
        response:
          "Step 1 → Open Assignments in the student portal.\nStep 2 → Review the title, subject, and due date.\nStep 3 → Choose Submit or Resubmit for the assignment.\nStep 4 → Add your submission details or attach your file.\nStep 5 → Submit and confirm the status updates in EduHub.\n\nI can guide you on EduHub steps, but not complete the assignment for you.",
      },
      {
        keywords: ["quiz", "test", "exam"],
        response:
          "Step 1 → Open Tests or Quizzes from the student menu.\nStep 2 → Select the assessment you want to start or review.\nStep 3 → Read the instructions carefully before beginning.\nStep 4 → Complete the assessment inside the EduHub workflow.\nStep 5 → After submission, return to Results or History to review the outcome.",
      },
      {
        keywords: ["result", "results", "marks", "score"],
        response:
          "Step 1 → Open Results from the student sidebar.\nStep 2 → Review the available scores or subject records.\nStep 3 → Open the relevant result item for more detail.\nStep 4 → Compare the marks with your completed assessments.\nStep 5 → Use History if you want to review older activity.",
      },
    ],
    fallback:
      "I can help only with EduHub student navigation and academic support.\nStep 1 → Ask about timetable, notes, assignments, quizzes, tests, or results.\nStep 2 → Mention the portal action you want to complete.\nStep 3 → I will answer with simple EduHub steps.",
  },
};

const getResponse = (role: PortalRole, prompt: string): string => {
  const normalizedPrompt = prompt.toLowerCase();
  const config = AGENT_CONFIG[role];

  const matchedIntent = config.intents.find((intent) =>
    intent.keywords.some((keyword) => normalizedPrompt.includes(keyword)),
  );

  return matchedIntent?.response ?? config.fallback;
};

const renderMessageLines = (text: string) =>
  text.split("\n").map((line, index) => (
    <p key={`${line}-${index}`} className="leading-relaxed">
      {line}
    </p>
  ));

const EduHubAgentAvatar = ({
  className = "h-12 w-12",
  showStatus = false,
  statusClassName = "bg-emerald-400",
}: {
  className?: string;
  showStatus?: boolean;
  statusClassName?: string;
}) => (
  <div className={`relative isolate ${className}`}>
    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/35 via-sky-500/25 to-cyan-400/30 blur-md" />
    <span className="absolute inset-[1px] rounded-full border border-white/15 bg-slate-950/85 shadow-[0_18px_40px_-18px_rgba(37,99,235,0.9)]" />
    <span className="absolute inset-[4px] rounded-full bg-gradient-to-br from-white/20 via-white/10 to-transparent" />
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full p-[2px]">
      <img
        src="/eduhub-icon.svg"
        alt="EduHub logo"
        className="relative z-10 h-full w-full rounded-full object-cover"
      />
    </div>
    {showStatus && (
      <>
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background/90" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${statusClassName}`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full animate-ping opacity-75 ${statusClassName}`}
        />
      </>
    )}
  </div>
);

const EduHubAIAgent = ({
  role,
  disabled = false,
  defaultOpen = false,
  disabledMessage = EDUHUB_AI_DISABLED_MESSAGE,
}: {
  role: PortalRole;
  disabled?: boolean;
  defaultOpen?: boolean;
  disabledMessage?: string;
}) => {
  const config = AGENT_CONFIG[role];
  const [open, setOpen] = useState(defaultOpen);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  const submitPrompt = (nextPrompt: string) => {
    const trimmedPrompt = nextPrompt.trim();
    if (!trimmedPrompt || disabled) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      { sender: "user", text: trimmedPrompt },
      { sender: "assistant", text: getResponse(role, trimmedPrompt) },
    ]);
    setPrompt("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {open && (
        <div className="relative w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-white/10 bg-background/95 shadow-[0_32px_90px_-38px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_38%)]" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />
          <div className={`relative h-1.5 w-full bg-gradient-to-r ${config.accentClassName}`} />
          <div className="relative flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <EduHubAgentAvatar
                className="h-16 w-16 shrink-0"
                showStatus
                statusClassName={disabled ? "bg-rose-400" : "bg-emerald-400"}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{config.title}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      disabled
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        disabled ? "bg-rose-400" : "animate-pulse bg-emerald-400"
                      }`}
                    />
                    {disabled ? "Paused" : "Live now"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{config.subtitle}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
                  Real-time EduHub support
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label={`Close ${config.title}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative space-y-4 px-5 py-5">
            {disabled ? (
              <div className="rounded-[1.6rem] border border-destructive/25 bg-destructive/10 p-4 text-sm text-foreground shadow-inner shadow-destructive/5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                  <EduHubAgentAvatar className="h-7 w-7" />
                  Assistant unavailable
                </div>
                <p>{disabledMessage}</p>
              </div>
            ) : (
              <>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm text-foreground shadow-inner shadow-slate-950/5 backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <EduHubAgentAvatar className="h-7 w-7" />
                      <Sparkles className="h-4 w-4 text-primary" />
                      Smart EduHub guidance
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-400" />
                      Ready
                    </span>
                  </div>
                  <p className="leading-relaxed">{config.welcome}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.quickActions.map((action) => (
                    <Button
                      key={action.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-white/10 bg-white/5 px-3 text-xs shadow-sm backdrop-blur-sm hover:bg-white/10"
                      onClick={() => submitPrompt(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/5 p-3 shadow-inner shadow-slate-950/5 dark:bg-slate-950/35">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Conversation
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <span className="h-2 w-2 rounded-full animate-pulse bg-emerald-400" />
                      Active chat
                    </span>
                  </div>

                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-background/70 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Ask a question to start chatting.</p>
                        <p className="mt-1">I will answer with simple EduHub steps in a chat-style format.</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div
                          key={`${message.sender}-${index}`}
                          className={`flex ${message.sender === "assistant" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm shadow-sm ${
                              message.sender === "assistant"
                                ? "rounded-bl-md border border-white/10 bg-background/85 text-foreground"
                                : `rounded-br-md bg-gradient-to-r ${config.accentClassName} text-white`
                            }`}
                          >
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                              {message.sender === "assistant" ? "EduHub AI" : "You"}
                            </div>
                            {renderMessageLines(message.text)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-white/10 bg-background/80 p-3 shadow-inner shadow-slate-950/5 backdrop-blur-sm">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Message EduHub AI
                    </span>
                    <span className="text-[11px] text-muted-foreground">Step-by-step replies</span>
                  </div>
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={config.placeholder}
                    rows={3}
                    className="min-h-[88px] resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      className={`gap-2 rounded-full px-5 text-white shadow-lg shadow-primary/20 ${
                        disabled ? "bg-destructive hover:bg-destructive/90" : `bg-gradient-to-r ${config.accentClassName}`
                      }`}
                      onClick={() => submitPrompt(prompt)}
                    >
                      <Send className="h-4 w-4" />
                      Ask assistant
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={`group relative h-20 w-20 rounded-full border border-white/15 p-0 shadow-[0_20px_50px_-22px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
            disabled
              ? "bg-destructive/90 hover:bg-destructive"
              : "bg-slate-950/85 hover:bg-slate-950"
          }`}
          aria-label={`Open ${config.title}`}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/25 via-sky-500/10 to-cyan-400/20 opacity-90 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          <span className="absolute inset-[5px] rounded-full border border-white/10 bg-white/5" />
          <span className="relative flex h-full w-full items-center justify-center">
            <EduHubAgentAvatar
              className="h-16 w-16"
              showStatus
              statusClassName={disabled ? "bg-rose-400" : "bg-emerald-400"}
            />
          </span>
        </Button>
      )}
    </div>
  );
};

export default EduHubAIAgent;