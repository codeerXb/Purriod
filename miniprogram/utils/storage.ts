import { clearLocalUserData } from "../repositories/local-store";
export { loadSettings as getUserSettings, saveSettings as saveUserSettings } from "../repositories/settings-repository";
export {
  loadRecords as getPeriodRecords,
  saveRecord as savePeriodRecord,
} from "../repositories/records-repository";

export async function clearAllUserData(): Promise<void> {
  clearLocalUserData();
}
