import React from "react";
import { useParams } from "react-router-dom";
import FacultyLayout from "@/components/FacultyLayout";
import { FacultyQuizResults as QuizResults } from "@/components/FacultyQuizResults";

const FacultyQuizResults: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();

  if (!quizId) {
    return <div>Quiz not found</div>;
  }

  return (
    <FacultyLayout>
      <QuizResults quizId={parseInt(quizId)} />
    </FacultyLayout>
  );
};

export default FacultyQuizResults;
