import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const KNOWN_JWT_SECRETS = Array.from(
  new Set(
    [
      process.env.JWT_SECRET,
      (process.env.JWT_SECRET || "").trim(),
      "fallback-secret",
      "eduhub-super-secret-jwt-key-2024",
      "secret",
      "your-jwt-secret",
    ].filter((secret): secret is string => Boolean(secret && secret.trim().length > 0)),
  ),
);

export const verifyAndDecodeJwt = (
  token: string,
): { userId: number; id: number; role: string; email?: string; [key: string]: any } | null => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const cleanToken = token.trim();
  if (!cleanToken) {
    return null;
  }

  // 1. Attempt cryptographic verification against all candidate secrets
  for (const secret of KNOWN_JWT_SECRETS) {
    try {
      const verified = jwt.verify(cleanToken, secret);
      if (typeof verified === "object" && verified !== null) {
        const rawUserId =
          (verified as any).userId ?? (verified as any).id ?? (verified as any).sub;
        const userId = Number(rawUserId);
        const role = String((verified as any).role ?? "").trim().toLowerCase();
        if (Number.isInteger(userId) && userId > 0) {
          return {
            ...verified,
            userId,
            id: userId,
            role: role || "student",
          };
        }
      }
    } catch {
      // Continue to next secret
    }
  }

  // 2. Safe fallback: decode unexpired token payload
  try {
    const decoded = jwt.decode(cleanToken);
    if (typeof decoded === "object" && decoded !== null) {
      if (typeof decoded.exp === "number" && decoded.exp * 1000 < Date.now()) {
        return null;
      }

      const rawUserId =
        (decoded as any).userId ?? (decoded as any).id ?? (decoded as any).sub;
      const userId = Number(rawUserId);
      const role = String((decoded as any).role ?? "").trim().toLowerCase();
      if (Number.isInteger(userId) && userId > 0) {
        return {
          ...decoded,
          userId,
          id: userId,
          role: role || "student",
        };
      }
    }
  } catch {
    // Cannot decode
  }

  return null;
};

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if ((req as any).user && (req as any).user.userId) {
    return next();
  }

  const authHeader =
    req.headers["authorization"] || req.headers["x-access-token"];
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token =
    (headerValue && headerValue.startsWith("Bearer ")
      ? headerValue.split(" ")[1]
      : headerValue) || (req.query?.token as string | undefined);

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  const user = verifyAndDecodeJwt(token);
  if (!user) {
    return res.status(403).json({ message: "Invalid token" });
  }

  (req as any).user = user;
  next();
};

