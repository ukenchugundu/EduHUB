const POST_LOGIN_NOTIFICATION_KEY = "eduhub_post_login_notification";

export const queuePostLoginNotification = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(POST_LOGIN_NOTIFICATION_KEY, "1");
};

export const consumePostLoginNotification = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const shouldShow = sessionStorage.getItem(POST_LOGIN_NOTIFICATION_KEY) === "1";
  if (shouldShow) {
    sessionStorage.removeItem(POST_LOGIN_NOTIFICATION_KEY);
  }

  return shouldShow;
};