import FacultyLayout from "@/components/FacultyLayout";
import FacultyTaskHub from "@/components/FacultyTaskHub";

const FacultyTests = () => {
  return (
    <FacultyLayout title="Coding Tests">
      <FacultyTaskHub mode="test" />
    </FacultyLayout>
  );
};

export default FacultyTests;
