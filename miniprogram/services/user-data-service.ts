import { clearLocalUserData } from "../repositories/local-store";

export async function deleteAllUserData(): Promise<void> {
  const response = await wx.cloud.callFunction({ name: "deleteUserData" });
  if (!response?.result?.success) {
    throw new Error("云端数据删除未完成");
  }
  clearLocalUserData();
}
