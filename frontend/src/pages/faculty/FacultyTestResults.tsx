import React from "react";
import { useParams } from "react-router-dom";
import FacultyLayout from "@/components/FacultyLayout";
import { FacultyTestResults as TestResults } from "@/components/FacultyTestResults";

const FacultyTestResults: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return <div>Test not found</div>;
  }

  return (
    <FacultyLayout>
      <TestResults testId={parseInt(testId)} />
    </FacultyLayout>
  );
};

export default FacultyTestResults;
