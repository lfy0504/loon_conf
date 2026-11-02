# Loon 自动分流配置

主文件：[Loon.conf](Loon.conf)

## 手机导入地址

- GitHub Raw（最新）：
  `https://raw.githubusercontent.com/lfy0504/loon_conf/main/Loon.conf`
- jsDelivr：
  `https://cdn.jsdelivr.net/gh/lfy0504/loon_conf@main/Loon.conf`
  > jsDelivr 的 `@main` 有缓存，可能短时间内仍是旧版本；以最终消息里的固定版本链接为准。

## 功能

- **自动分流**：广告拦截、中国大陆直连、其余流量走主策略
- **自动测速**：所有地区组使用 `url-test`，每 600 秒测速，自动选延迟最低的节点
- **地区分组**：香港、美国、新加坡、日本、台湾、韩国、其他
- **总入口**：`主策略` 默认选中 `自动选择`（全部节点中最快的一个），也可手动切到任意地区
- **订阅留空**：为避免泄露 token，配置不包含机场订阅；导入后手动填写订阅地址
- **UA 已预留**：机场要求 `User-Agent: shadowrocket`，订阅项已保留 `resource-parser` 参数

## 使用步骤

1. 在 Loon 中导入 `Loon.conf`：
   - 配置 → 添加配置 → 从文件导入，选择 `Loon.conf`；或
   - 新建配置后，把文件内容粘贴进去。
2. 在 Loon 的“配置 → 编辑”里找到 `[Remote Proxy]`，把**整行**替换成你的订阅地址，保留后面的参数：
   ```ini
   我的订阅 = 你的订阅地址,parser-enabled=true,argument="resourceUrlOnly=true&ua=shadowrocket&noCache=true",enabled=true
   ```
   > 不要只在“订阅 URL”输入框里单独改地址，否则 Loon 可能重建订阅项并丢掉 `parser-enabled` 和 `argument`，结果仍然是 403。
3. 启动 Loon，在“策略”页确认节点已经出现，并检查各地区的节点数量。

> 本配置不包含订阅地址或 token；填写订阅后的配置请勿公开分享。
>
> 该机场订阅为 `AnyTLS` 协议，需要 Loon 3.5.1 或更高版本。

## 为什么需要解析器

直接让 Loon 下载订阅时，Loon 会使用自己的 User-Agent，机场返回 `403 Forbidden`。实测只有 `User-Agent: shadowrocket` 才能拿到节点。

配置里使用 Sub-Store 资源解析器：

```ini
[General]
resource-parser = https://cdn.jsdelivr.net/gh/sub-store-org/Sub-Store@release/sub-store-parser.loon.min.js

[Remote Proxy]
我的订阅 = https://...,parser-enabled=true,argument="resourceUrlOnly=true&ua=shadowrocket&noCache=true",enabled=true
```

- `resource-parser` 加载 Sub-Store 解析器；
- `parser-enabled=true` 让该订阅走解析器；
- `argument` 里的 `resourceUrlOnly=true&ua=shadowrocket` 让解析器用 `shadowrocket` 这个 User-Agent 重新拉取；
- 解析器同时负责 Base64 解码和 `anytls://` 转 Loon 节点格式。

解析器来自 [Sub-Store](https://github.com/sub-store-org/Sub-Store)，使用 `release` 分支的 jsDelivr 地址，避免手机端访问 GitHub Release 失败。

## 分组说明

| 分组 | 类型 | 作用 |
| --- | --- | --- |
| 主策略 | `select` | 总入口，默认 `自动选择`，可手动切地区或 `DIRECT` |
| 自动选择 | `url-test` | 在全部节点中自动选最快 |
| 香港 | `url-test` | 香港节点中自动选最快 |
| 美国 | `url-test` | 美国节点中自动选最快 |
| 新加坡 | `url-test` | 新加坡节点中自动选最快 |
| 日本 | `url-test` | 日本节点中自动选最快 |
| 台湾 | `url-test` | 台湾节点中自动选最快 |
| 韩国 | `url-test` | 韩国节点中自动选最快 |
| 其他 | `url-test` | 不属于以上六类的节点中自动选最快 |

地区归组依靠 `[Remote Filter]` 里的节点名正则，不依赖订阅自带的分组。节点名里只要包含 `香港`、`HK/HKG`、`US/USA`、`Singapore/SIN`、`JP/NRT`、`TW/TPE`、`KR/ICN` 等关键词，就会进入对应地区组。

## 自动分流规则

按以下顺序生效：

1. 本地/局域网地址 → `DIRECT`
2. `.cn` 域名 → `DIRECT`
3. 广告规则（`AdvertisingLite`）→ `REJECT`
4. 中国大陆规则（`ChinaMax`）→ `DIRECT`
5. `GEOIP,CN` → `DIRECT`（兜底）
6. 其余流量 → `主策略`

规则通过 jsDelivr 下载，国内网络通常比 GitHub Raw 更稳定。如果 jsDelivr 不可用，文件末尾附了 GitHub Raw 备用地址。

## 测速参数

```ini
interval = 600     # 每 600 秒测一次
tolerance = 50     # 新旧最优节点延迟差小于 50ms 时不切换
test-timeout = 3   # 单节点测速超时 3 秒
```

想更快刷新，可以把 `interval` 改成 `300`；想省电，可以改成 `1800`。

## 自定义

### 固定某类服务走指定地区

在 `[Rule]` 中找到“可选：固定服务地区”，取消注释并修改，例如：

```ini
DOMAIN-SUFFIX,openai.com,美国
DOMAIN-SUFFIX,claude.ai,美国
DOMAIN-SUFFIX,github.com,香港
```

这些规则会排在 `FINAL` 之前，优先级高于默认的 `主策略`。

### 机场更换了 UA

如果机场以后要求别的 User-Agent，修改 `[Remote Proxy]` 中的：

```ini
argument="resourceUrlOnly=true&ua=shadowrocket&noCache=true"
```

把 `shadowrocket` 换成机场要求的值即可，例如 `clash.meta/v1.19.99`。

### 节点没有正确归组

在 `[Remote Filter]` 对应地区的 `FilterKey` 中补充关键词。例如某机场把香港节点命名为 `东方之珠`，就把 `东方之珠` 加到香港的括号里：

```ini
香港节点 = NameRegex, FilterKey = "(?i)(香港|港|东方之珠|...)"
```

修改后注意“其他节点”的排除列表也要同步加上该关键词，否则同一节点可能同时出现在“香港”和“其他”里。

### 地区组为空

先确认订阅本身能拉取到节点。如果节点已经出现但地区组为空，说明节点名没有匹配到关键词，补充 `FilterKey` 即可。

### 解析器加载失败

检查 `resource-parser` 地址是否能访问；如果 jsDelivr 不可用，可以把该地址换成解析器脚本的其他镜像地址，或临时把节点直接写入 `[Proxy]`。

如果日志仍然显示 `403`，确认 Loon 版本不低于 3.5.1，并在 Loon 日志中查看解析器是否执行；也可以尝试在 Loon 的“外部资源”中手动更新一次。

## 校验

- 使用 `User-Agent: shadowrocket` 请求订阅返回 HTTP 200。
- 解析器实测输出 57 个 `AnyTLS` 节点。
- 按当前节点名归组：香港 13、新加坡 11、美国 9、日本 6、台湾 3、韩国 3、其他 12。
- 8 个 `Remote Filter` 正则均通过语法检查，8 个 `url-test` 组和 1 个 `select` 组成员引用完整。

## 注意

- 一个节点名同时包含多个地区关键词时，可能进入多个地区组；建议机场节点名保持单一地区标识。
- `url-test` 只代表测速延迟最低，不保证该节点带宽最大或流媒体解锁最好。
- 广告规则含少量 `URL-REGEX`，未配置 MITM 时这部分规则可能不生效，但不影响主要域名/IP 拦截。
- 本配置本身不包含订阅凭证；在手机上填写订阅后，请不要把填好的配置公开分享。
