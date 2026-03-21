import FacultyLayout from "@/components/FacultyLayout";
import FacultyTaskHub from "@/components/FacultyTaskHub";

const FacultyQuizzes = () => {
  return (
    <FacultyLayout title="Quiz Management">
      <FacultyTaskHub mode="quiz" />
    </FacultyLayout>
  );
};

export default FacultyQuizzes;
