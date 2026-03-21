import FacultyLayout from "@/components/FacultyLayout";
import FacultyTaskHub from "@/components/FacultyTaskHub";

const FacultyTasks = () => {
  return (
    <FacultyLayout title="Task Management">
      <FacultyTaskHub mode="all" />
    </FacultyLayout>
  );
};

export default FacultyTasks;
