import { CLOUD_ENV_ID } from "./constants/config";
import { flushPendingSync } from "./services/sync-service";

App({
  globalData: {
    env: CLOUD_ENV_ID,
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    });

    flushPendingSync().catch((error) => {
      console.warn("initial Purriod sync pending", error);
    });
    wx.onNetworkStatusChange((status) => {
      if (status.isConnected) {
        flushPendingSync().catch((error) => {
          console.warn("network recovery sync pending", error);
        });
      }
    });
  },
});
