import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        role: string;
        departmentId?: number;
      };
    }
  }
}

export {};
