import React from "react";
import FacultyLayout from "@/components/FacultyLayout";
import { FacultyTestManagement as TestManagement } from "@/components/FacultyTestManagement";

const FacultyTestManagement: React.FC = () => {
  return (
    <FacultyLayout>
      <TestManagement />
    </FacultyLayout>
  );
};

export default FacultyTestManagement;
