// cspell:ignore eduhub
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PortalRole, readStoredAuth } from "@/lib/authSession";
import ViewMarks from "@/pages/admin/ViewMarks";
import TestMarks from "@/pages/admin/TestMarks";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminSchedule from "@/pages/admin/AdminSchedule";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import StudentTestInterface from "@/pages/student/StudentTestInterface";
import StudentTests from "@/pages/student/StudentTests";
import AdminHistory from "@/pages/admin/AdminHistory";
import StudentHistory from "@/pages/student/StudentHistory";
import FacultyHistory from "@/pages/faculty/FacultyHistory";
import CreateAssignment from "@/pages/faculty/CreateAssignment";
import CreateQuiz from "@/pages/faculty/CreateQuiz";
import CreateTest from "@/pages/faculty/CreateTest";
import FacultyQuizResults from "@/pages/faculty/FacultyQuizResults";
import FacultyTestResults from "@/pages/faculty/FacultyTestResults";
import FacultyTestManagement from "@/pages/faculty/FacultyTests";
import FacultyTasks from "@/pages/faculty/FacultyTasks";
import FacultyAnalytics from "@/pages/faculty/FacultyAnalytics";
import FacultyStudentPerformance from "@/pages/faculty/FacultyStudentPerformance";
import FacultyCommandCenter from "@/pages/faculty/FacultyCommandCenter";
import FacultyAttendance from "@/pages/faculty/FacultyAttendance";
import FacultyNotes from "@/pages/faculty/FacultyNotes";
import FacultyAssignments from "@/pages/faculty/FacultyAssignments";
import FacultyQuizzes from "@/pages/faculty/FacultyQuizzes";
import FacultyRoster from "@/pages/faculty/FacultyRoster";
import FacultyDashboard from "@/pages/faculty/FacultyDashboard";
import FacultyUploadMarks from "@/pages/faculty/UploadMarks";
import StudentResults from "@/pages/student/StudentResults";
import StudentQuizAttempt from "@/pages/student/StudentQuizAttempt";
import StudentQuizzes from "@/pages/student/StudentQuizzes";
import StudentAssignments from "@/pages/student/StudentAssignments";
import StudentNotes from "@/pages/student/StudentNotes";
import StudentDashboard from "@/pages/student/StudentDashboard";
import Auth from "@/pages/Auth";
import PreLogin from "@/pages/PreLogin";

const roleHomeRoutes: Record<PortalRole, string> = {
  student: "/student",
  faculty: "/faculty",
  admin: "/admin",
};

const queryClient = new QueryClient();

const ProtectedRoute = ({
  allowedRole,
  children,
}: {
  allowedRole: PortalRole;
  children: JSX.Element;
}) => {
  const auth = readStoredAuth();
  if (!auth) {
    return <Navigate to="/auth" replace />;
  }

  if (auth.role !== allowedRole) {
    return <Navigate to={roleHomeRoutes[auth.role]} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  const isResetMode =
    location.pathname === "/auth" &&
    new URLSearchParams(location.search).get("mode") === "reset";
  if (isResetMode) {
    return children;
  }

  const auth = readStoredAuth();
  if (!auth) {
    return children;
  }

  return <Navigate to={roleHomeRoutes[auth.role]} replace />;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <PreLogin />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicOnlyRoute>
            <Auth />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/notes"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentNotes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/assignments"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quizzes"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quizzes/:quizId"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentQuizAttempt />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/history"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/tests"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentTests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/test/:testId"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentTestInterface />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/profile"
        element={
          <ProtectedRoute allowedRole="student">
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/roster"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyRoster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/tasks"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/quizzes"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/assignments"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/create-assignment"
        element={
          <ProtectedRoute allowedRole="faculty">
            <CreateAssignment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/notes"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyNotes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/attendance"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/history"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/command-center"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyCommandCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/performance"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyStudentPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/performance/:studentId"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyStudentPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/analytics"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/tests"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyTestManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/test-results/:testId"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyTestResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/create-test"
        element={
          <ProtectedRoute allowedRole="faculty">
            <CreateTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/create-quiz"
        element={
          <ProtectedRoute allowedRole="faculty">
            <CreateQuiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/quiz-results/:quizId"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyQuizResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/upload-marks"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyUploadMarks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/profile"
        element={
          <ProtectedRoute allowedRole="faculty">
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedule"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminSchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/history"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/marks"
        element={
          <ProtectedRoute allowedRole="admin">
            <ViewMarks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/marks/:testId"
        element={
          <ProtectedRoute allowedRole="admin">
            <TestMarks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRole="admin">
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </>,
  ),
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

const routerProviderFuture = {
  v7_startTransition: true,
} as const;

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="eduhub-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} future={routerProviderFuture} />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
