import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "./useAuth";

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

    // Request permission on mount
    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
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
