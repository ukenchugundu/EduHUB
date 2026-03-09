import React from "react";
import { useParams } from "react-router-dom";
import { StudentTestInterface } from "@/components/StudentTestInterface";

const StudentTest: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();

  if (!testId) {
    return <div>Test not found</div>;
  }

  return <StudentTestInterface testId={parseInt(testId)} />;
};

export default StudentTest;
