# dsh-host-paths

**把文件拖进 DSH Desktop，输入框里得到的是 `@路径` 引用，而不是一份被上传的副本。**

[dsh-host-paths](https://github.com/384124694/dsh-host-paths) 是一个只做一件事的小插件：把桌面壳 preload 里的文件路径桥
（`window.__DSH_DESKTOP_FILE_PATH__`）接到 DSH 输入框**本来就有**的宿主路径接缝
（`globalThis.__DSH_HOST_PATHS__`）上。接上之后，官方 composer 自己就会把拖入的文件转成
`@路径` chip——不需要插件抢事件，也不需要它替你读文件。

## 问题

DSH 的输入框里有两条互斥的落地路径（`dsh-client-ui-conversation` 的 `addFiles`）：

```
path = 宿主路径桥?.pathFor(file) ?? ""
path === "" || 图片        → 上传（file draft，物化到会话附件目录）
否则                      → @路径 引用 chip（零上传）
```

而 `__DSH_HOST_PATHS__` 这个名字在 DSH Desktop 里**没有任何代码写入**：壳只暴露
`__DSH_DESKTOP_FILE_PATH__`（Electron `webUtils.getPathForFile`）。于是第二条分支永远不走，
拖什么都是上传——哪怕 Electron 明明知道那个文件的真实路径。

本插件就是把这两个名字接起来的那一行。

## 装上之后

| 你做的事 | 结果 |
| --- | --- |
| 拖入非图片文件（docx / xlsx / pdf / zip…） | 输入框出现 `@绝对路径` chip，**零上传、零复制**；文件在工作区内时自动写成相对路径 |
| 拖入文件夹 | 出现 `@路径/` 文件夹 chip |
| 拖入图片 | 仍走原生图片通道上传（官方设计：缩略图、尺寸探测、多图限额都在这条路上） |
| 路径含空格 | 自动用 `@"带 空格 的 路径.docx"` 引号语法 |
| 壳拿不到真路径（OneDrive 占位符、压缩包内拖出、纯浏览器打开） | 自动回落成官方原有的上传行为，不会报错 |

**不做**的事：不读文件内容、不复制、不搬移、不删改、不联网、不注册任何 host 服务，
也不覆盖别人已经装好的同名前接缝（未来的 DSH 如果自己接了，本插件自动让位）。

## 安装

```sh
# 从 GitHub（建议钉住 commit）
dsh plugin --profile desktop add github:384124694/dsh-host-paths#<sha>

# 从本地检出
git clone https://github.com/384124694/dsh-host-paths.git
dsh plugin --profile desktop add link:$HOME/dsh-host-paths
```

`--profile` 填你实际在用的那个（DSH Desktop 通常是 `desktop`，纯 `dsh web` 是 `web`）。
**重启 DSH Desktop（或重跑 `dsh web`）并刷新页面**后生效——客户端半是启动时编进
`__DSH_BOOT__` 的。包内已带构建产物（`lib/`），无需构建步骤。

## 验证

F12 打开 Console：

```js
window.__DSH_HOST_PATHS__                        // 装好后应为 { pathFor: ƒ }
typeof window.__DSH_DESKTOP_FILE_PATH__?.getPathForFile   // 应为 "function"
window.__DSH_HOST_PATHS__.pathFor($0)            // 在 Elements 里选中一个 file input 的 File 再试
```

然后拖一个非图片文件：输入框应出现 `@路径` chip，**输入框上方不该出现文件卡片**（那就是上传）。

## 卸载

```sh
dsh plugin --profile desktop remove dsh-host-paths
```

重启后接缝消失，拖拽回到官方默认行为。

## 开发

```sh
npm test        # node --test：7 项行为测试，不需要 DSH 服务器
```

`lib/client.js` 是手写的经典脚本（`window.__ModuleLoader__.load({ id, factory })`），
没有构建步骤：改完直接重启 profile 即可。`lib/index.js` 是空的 host 半，只为了让这个 bundle
在 Loader 里有一个条目、客户端产物才会进 `__DSH_BOOT__`。

## 已知边界

- **只在 DSH Desktop（Electron）里有意义。** 普通浏览器没有路径桥，本插件静默不装接缝，
  拖拽保持官方行为（上传）——它不会假装成功。
- **图片仍然上传**，这是官方 composer 的既定分支，本插件不改变它。
- 引用 chip 里的路径：文件在工作区内时是相对 cwd 的路径，否则是绝对路径。
- 若某个未来 DSH 版本自己写了 `__DSH_HOST_PATHS__`，本插件检测到已有值就不覆盖。

## License

MIT
