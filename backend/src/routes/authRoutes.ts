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
} from "../controllers/authController";

const router = Router();

router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser);
router.post("/auth/login/verify-otp", verifyLoginOtp);
router.post("/auth/login/resend-otp", resendLoginOtp);
router.post("/auth/forgot-password", requestPasswordReset);
router.post("/auth/reset-password", resetPassword);
router.post("/admin/members", createMemberByAdmin);
router.get("/admin/members", getAdminMembers);
router.put("/admin/members/:memberId", updateAdminMember);
router.delete("/admin/members/:memberId", deleteAdminMember);
router.get("/admin/dashboard", getAdminDashboardData);

export default router;
