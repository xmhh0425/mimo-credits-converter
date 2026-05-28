# Chrome Extensions

日常好用的 Chrome 扩展集合，解决实际使用中的痛点。

## 扩展列表

| 扩展 | 版本 | 说明 |
|------|------|------|
| [mimo-credits-converter](./mimo-credits-converter) | 2.0.0 | 小米 MiMo 开放平台：Credits → 人民币换算 + Token 消耗统计 |

> 持续迭代中，后续会加入更多实用扩展。

## 安装方式

所有扩展均为未打包的 Manifest V3 扩展，安装步骤：

1. 打开 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择对应扩展目录

## 开发说明

每个扩展独立为一个目录，互不依赖。进入对应目录直接编辑代码，修改后在 `chrome://extensions/` 刷新扩展卡片，再刷新目标页面即可生效。
