# Purriod 云开发配置与验收

本文用于部署 Purriod 第一版。第一版只使用两个数据库集合和一个删除云函数，不包含微信订阅消息。

## 1. 环境

微信云开发环境 ID：

```text
cloud1-d3gth40uhfb98e9c6
```

`miniprogram/constants/config.ts` 与开发者工具当前项目必须选择同一个环境。不要把其他测试环境的数据混入这个环境。

## 2. 创建数据库集合

在微信开发者工具的“云开发 → 数据库”中只创建：

- `user_settings`
- `period_records`

第一版不创建 `user_profiles`、提醒、社区、内容或商业化相关集合。

## 3. 设置用户数据权限

两个集合都选择 CloudBase 控制台的 `PRIVATE`，即“仅创建者及管理员可读写”预设。

需要逐项确认：

- 用户登录后只能查询自己创建的文档。
- 客户端创建文档时由云数据库写入 `_openid`，页面代码不得把 openid 作为数据或授权条件提交。
- 更新和删除只能作用于当前用户拥有的文档。
- 未配置的操作默认保持拒绝，不要把集合临时改成“所有用户可读写”。

CloudBase 安全规则把 `read`、`create`、`update`、`delete` 分开判断，并提供 `auth.openid` 作为微信身份变量。优先使用控制台的创建者预设，避免在第一版自行拼写一套不完整规则。

官方说明：[CloudBase 安全规则](https://docs.cloudbase.net/rule/learn-rules)

## 4. 配置索引

在数据库索引管理中添加：

### `period_records`

- `date`：升序。
- `updatedAt`：降序。

### `user_settings`

- `updatedAt`：降序。

保存后等待索引状态变为可用。`period_records.date` 用于日期范围与升序分页，`updatedAt` 用于读取最近更新的数据和排查重复设置。

## 5. 上传删除云函数

云函数目录：

```text
cloudfunctions/deleteUserData
```

在微信开发者工具中：

1. 右键 `deleteUserData`。
2. 选择“上传并部署：云端安装依赖”。
3. 确认部署环境为 `cloud1-d3gth40uhfb98e9c6`。
4. 在云函数日志中确认调用时能取得 `OPENID`。
5. 不要给函数增加客户端传入的 openid 参数。

函数使用微信小程序云开发服务端 SDK、动态当前环境和可信运行上下文，分页删除调用者在 `user_settings` 与 `period_records` 中的数据。

官方 SDK：[wechat-miniprogram/wx-server-sdk](https://github.com/wechat-miniprogram/wx-server-sdk)

## 6. 本地验证

在项目根目录执行：

```bash
npm install
npm test
npm run typecheck
```

微信小程序 Canvas 2D 需要显式使用 `type="2d"` 并设置实际画布宽高。Purriod 的三个图表组件会按照设备像素比设置画布，同时保留 WXML 数值作为降级显示。

官方说明：[微信小程序 Canvas](https://developers.weixin.qq.com/miniprogram/dev/component/canvas.html)

## 7. 两个微信身份的权限验收

准备微信测试身份 A 和 B，按顺序验证：

1. A 保存设置并记录两天数据，确认云端文档 `_openid` 属于 A。
2. B 打开小程序，确认无法读取 A 的设置和记录。
3. B 创建自己的设置和记录。
4. A 修改或删除自己的单日记录，确认 B 的记录不受影响。
5. 使用控制台或测试代码尝试让 A 查询、更新 B 的文档，操作必须被拒绝。
6. A 执行“清除我的数据”，确认只删除 A 在两个集合中的文档。
7. 确认 B 的文档仍然存在且可以正常读取。

只验证页面“看不见”不够，必须同时检查云端集合和失败日志，确认跨用户读取与修改确实被权限层拒绝。

## 8. 删除与离线验收

- 断网保存一条记录，页面应显示“已保存在本机，等待同步”。
- 恢复网络后重新进入页面，待同步队列应清零，云端出现同日期记录。
- 断网删除单日记录，记录应立即从本机隐藏，恢复网络后云端记录被删除。
- 断网执行“清除我的数据”必须失败，并保留本地设置、记录和待同步队列。
- 联网执行“清除我的数据”成功后，本地缓存和两个云集合中当前用户的数据都应为空。

## 9. 发布前检查

- 第一版没有调用 `wx.requestSubscribeMessage`。
- 隐私政策准确描述经期、流量、痛经、白带、心情、症状和备注的用途。
- 所有预测文案使用“预计”“约”等表达，不提供诊断或治疗建议。
- iOS、Android 各至少完成一次真机记录、同步、删除和图表清晰度检查。
