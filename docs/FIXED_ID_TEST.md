# 双设备固定 ID 测试

测试扩展 ID：`hfccbmdakfihnkmoocmnghmijieijboh`。

`public/manifest.json` 中的 `key` 是固定测试公钥，后续构建会保留。不要重新生成，否则 ID 会改变。此 ID 与商店版本和此前本地版本可能不同，存储数据也相互独立。

1. 将同一份 `mfa-2.2.0-fixed-id-test.zip` 复制到两台设备并解压。
2. 打开 `chrome://extensions`，开启开发者模式，选择“加载已解压的扩展程序”，选中包含 manifest.json 的目录。
3. 确认两台设备显示的 ID 都是 `hfccbmdakfihnkmoocmnghmijieijboh`。
4. 使用同一 Chrome 账号并开启扩展数据同步，先添加虚拟测试账户，确认另一台实际收到。
5. 再测试开启密码保护、另一台收到后锁定、输入同一密码解锁，以及离线后恢复同步。

固定 ID 只是统一扩展身份，不代表 Chrome 同步已经完成，也不修复现有离线写入冲突。不要卸载原扩展；新 ID 不会自动迁移原扩展账户。

生产发布时应核对商店条目公钥，不要把本测试 ID 当作既有商店 ID。
