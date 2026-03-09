import { useEffect } from "react";
import { toast } from "sonner";
import type { StoredAuthSession } from "@/lib/authSession";
import { consumePostLoginNotification } from "@/lib/postLoginNotification";

const getWelcomeName = (auth: StoredAuthSession): string => {
  const fullName = auth.fullName.trim();
  if (fullName) {
    return fullName;
  }

  const emailPrefix = auth.email.split("@")[0]?.trim();
  return emailPrefix || "User";
};

const PostLoginNotifier = ({ auth }: { auth: StoredAuthSession | null }) => {
  useEffect(() => {
    if (!auth || !consumePostLoginNotification()) {
      return;
    }

    toast.success(`Welcome, ${getWelcomeName(auth)}!`, {
      description: "Check your latest EduHub updates and notifications in the dashboard.",
      duration: 4500,
    });
  }, [auth]);

  return null;
};

export default PostLoginNotifier;