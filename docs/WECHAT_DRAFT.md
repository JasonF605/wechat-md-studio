# 推送到微信公众号草稿箱

WeChat MD Studio 从 v0.2 开始支持把 Markdown 文章创建为微信公众号草稿。

这个功能只在你显式运行 `draft` 命令时才会调用微信接口。普通的 `format`、`preview`、`recommend` 都是本地操作。

## 1. 准备公众号后台

在微信公众号后台完成这些设置：

1. 打开 <https://mp.weixin.qq.com/>
2. 进入「设置与开发 -> 基本配置」
3. 获取 `AppID`
4. 获取或重置 `AppSecret`
5. 把当前机器或服务器公网 IP 加入 IP 白名单

如果获取 token 时报 `40164`，通常就是 IP 白名单没有配置好。

## 2. 配置 `.env`

复制 `.env.example` 为 `.env`：

```dotenv
WECHAT_APPID=你的_AppID
WECHAT_APPSECRET=你的_AppSecret
WECHAT_AUTHOR=作者名
WECHAT_THUMB_MEDIA_ID=
WECHAT_CONTENT_SOURCE_URL=
```

`WECHAT_THUMB_MEDIA_ID` 可以不填。创建草稿时用 `--cover <image>` 上传封面即可。

## 3. 检查本地配置

```bash
wechat-md-studio doctor
```

或在源码目录里：

```bash
node ./bin/wechat-md-studio.js doctor --json
```

## 4. 先 dry-run

dry-run 不会上传图片，也不会创建草稿，只会检查参数和生成 payload 摘要：

```bash
node ./bin/wechat-md-studio.js draft examples/ai-money.md \
  --thumb-media-id TEST_THUMB_MEDIA_ID \
  --dry-run \
  --json
```

如果想看完整 payload，加 `--payload`：

```bash
node ./bin/wechat-md-studio.js draft examples/ai-money.md \
  --thumb-media-id TEST_THUMB_MEDIA_ID \
  --dry-run \
  --payload \
  --json
```

## 5. 上传封面

方式一：单独上传封面，拿到 `mediaId`：

```bash
node ./bin/wechat-md-studio.js upload-cover ./cover.jpg --json
```

然后创建草稿：

```bash
node ./bin/wechat-md-studio.js draft ./article.md \
  --thumb-media-id MEDIA_ID_FROM_UPLOAD
```

方式二：创建草稿时直接上传封面：

```bash
node ./bin/wechat-md-studio.js draft ./article.md \
  --cover ./cover.jpg
```

方式三：使用文章里的第一张本地图片做封面：

```bash
node ./bin/wechat-md-studio.js draft ./article.md \
  --cover first
```

## 6. 创建草稿

```bash
node ./bin/wechat-md-studio.js draft ./article.md \
  --cover ./cover.jpg \
  --theme auto \
  --json
```

常用参数：

- `--title`：覆盖文章标题，微信标题最长 32 字。
- `--truncate-title`：标题超长时自动截断到 32 字。
- `--author`：作者名，最长 16 字。
- `--digest`：摘要，最长 128 字。
- `--source-url`：原文链接。
- `--open-comment`：开启评论。
- `--fans-comment`：仅粉丝可评论。
- `--external-images keep|skip|fail`：处理外部图片，默认 `fail`。

## 注意事项

- 创建草稿需要封面 `thumb_media_id`。
- 正文里的本地图片会先上传到微信图文图片接口，再替换为微信图片 URL。
- 非微信域名的外部图片默认会阻止创建草稿，避免草稿里图片失效。
- 本工具只创建草稿，不群发、不发布。
