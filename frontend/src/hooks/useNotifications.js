import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "./useAuth";

/**
 * Ask for notification permission.
 *
 * Call this from a user gesture. It used to run on mount, which meant a
 * permission prompt appeared the instant you signed in, with no explanation of
 * what it was for — and Chrome increasingly ignores permission requests that
 * are not tied to a gesture, so it often achieved nothing anyway. It now runs
 * when you create a price alert, which is both a real gesture and the moment
 * the permission is obviously relevant.
 */
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Promise.resolve(
    "Notification" in window ? Notification.permission : "denied"
  );
}

export function useNotifications() {
  const navigate = useNavigate();
  const intervalRef = useRef(null);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  useEffect(() => {
    // If not authenticated, clear any existing interval and do nothing
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkAlerts = async () => {
      if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      try {
        const res = await api.get("/alerts/triggered");
        const alerts = res.data || [];

        alerts.forEach((alert) => {
          const notif = new Notification(
            "📈 StockSense Alert",
            {
              body: alert.message,
              icon: "/favicon.ico",
              tag: `alert-${alert.id}`,
            }
          );

          notif.onclick = () => {
            window.focus();
            navigate(`/stock/${alert.symbol}`);
            notif.close();
          };
        });
      } catch (e) {
        console.log("Alert check error:", e);
      }
    };

    // Check immediately, then every 60 seconds
    checkAlerts();
    intervalRef.current = setInterval(checkAlerts, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [navigate, isAuthenticated]);
}
