import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface StudentAIAssistanceContextValue {
  isRestricted: boolean;
  setRestriction: (source: string, active: boolean) => void;
}

const StudentAIAssistanceContext = createContext<
  StudentAIAssistanceContextValue | undefined
>(undefined);

export const StudentAIAssistanceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [restrictions, setRestrictions] = useState<Record<string, boolean>>({});

  const setRestriction = useCallback((source: string, active: boolean) => {
    setRestrictions((previous) => {
      if (active) {
        if (previous[source]) {
          return previous;
        }
        return { ...previous, [source]: true };
      }

      if (!previous[source]) {
        return previous;
      }

      const next = { ...previous };
      delete next[source];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isRestricted: Object.values(restrictions).some(Boolean),
      setRestriction,
    }),
    [restrictions, setRestriction],
  );

  return (
    <StudentAIAssistanceContext.Provider value={value}>
      {children}
    </StudentAIAssistanceContext.Provider>
  );
};

export const useStudentAIAssistance = () => {
  const context = useContext(StudentAIAssistanceContext);
  if (!context) {
    throw new Error(
      "useStudentAIAssistance must be used within StudentAIAssistanceProvider.",
    );
  }

  return context;
};