import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyLoginOtp,
  resendLoginOtp,
  requestPasswordReset,
  resetPassword,
  createMemberByAdmin,
  getAdminMembers,
  updateAdminMember,
  deleteAdminMember,
  getAdminDashboardData,
  getAdminClassOptions,
  updateFacultyClassAllocations,
  getFacultyClassAllocationsForCurrentUser,
  getCurrentUserProfile,
} from "../controllers/authController";
import {
  deleteBatchAllocation,
  getBatchAllocations,
  saveBatchAllocation,
} from "../controllers/batchAllocationController";
import { authenticateToken } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser);
router.post("/auth/login/verify-otp", verifyLoginOtp);
router.post("/auth/login/resend-otp", resendLoginOtp);
router.post("/auth/forgot-password", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);
router.get("/auth/me", authenticateToken, getCurrentUserProfile);
router.post("/admin/members", createMemberByAdmin);
router.get("/admin/members", getAdminMembers);
router.put("/admin/members/:memberId", updateAdminMember);
router.delete("/admin/members/:memberId", deleteAdminMember);
router.get("/admin/dashboard", getAdminDashboardData);
router.get("/admin/class-options", getAdminClassOptions);
router.get("/admin/batch-allocations", authenticateToken, getBatchAllocations);
router.post("/admin/batch-allocations", authenticateToken, saveBatchAllocation);
router.delete(
  "/admin/batch-allocations/:allocationId",
  authenticateToken,
  deleteBatchAllocation,
);
router.put(
  "/admin/members/:memberId/class-allocations",
  updateFacultyClassAllocations,
);
router.get(
  "/faculty/class-allocations",
  authenticateToken,
  getFacultyClassAllocationsForCurrentUser,
);

export default router;
