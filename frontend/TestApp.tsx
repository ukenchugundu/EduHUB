import React from "react";

const TestApp = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#333" }}>EduHub Test Page</h1>
      <p>If you can see this, React is working correctly!</p>
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => (window.location.href = "/auth")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default TestApp;
