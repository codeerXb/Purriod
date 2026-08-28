const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function removeAll(collectionName, openid) {
  let removed = 0;
  while (true) {
    const { data } = await db
      .collection(collectionName)
      .where({ _openid: openid })
      .limit(100)
      .get();
    if (!data.length) return removed;
    await Promise.all(
      data.map((item) => db.collection(collectionName).doc(item._id).remove()),
    );
    removed += data.length;
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    throw new Error("无法确认当前用户身份");
  }
  const settingsRemoved = await removeAll("user_settings", OPENID);
  const recordsRemoved = await removeAll("period_records", OPENID);
  return { success: true, settingsRemoved, recordsRemoved };
};
