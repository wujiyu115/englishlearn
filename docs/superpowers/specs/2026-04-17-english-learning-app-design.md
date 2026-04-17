# 英语学习 App — 设计文档
日期：2026-04-17

## 概述

一款面向成人自学者（职场人士、碎片化时间）的游戏化英语学习 Flutter App，卡通风格参考 Duolingo，同时发布 Android 和 iOS 版本。

---

## 架构

### 技术栈

| 层级 | 技术选型 |
|---|---|
| 移动端 | Flutter + Riverpod（状态管理） |
| 网络层 | Dio + Retrofit |
| 本地数据库 | SQLite（drift） |
| 离线词典 | ECDICT（开源，内置） |
| OCR | Google ML Kit（端侧，免费） |
| 视频 | FFmpeg（本地）+ youtube_explode_dart（在线） |
| 语音 | Azure Speech SDK / 科大讯飞（发音评分） |
| 后端 | Go（RESTful API） |
| 数据库 | PostgreSQL |
| 文件存储 | S3 兼容对象存储 |
| 鉴权 | JWT |
| 大模型 | Claude / GPT API（场景对话生成） |

### 系统架构图

```
Flutter App
    │
    ├── 本地层（离线优先）
    │   ├── SQLite — 单词、进度、场景、文章
    │   ├── ECDICT — 离线词典
    │   ├── ML Kit — 端侧 OCR
    │   └── FFmpeg — 本地视频处理
    │
    └── 远程层
        ├── Go API 服务
        │   ├── 鉴权（JWT）
        │   ├── 云端同步（单词、经验值、连签）
        │   ├── 联赛排行榜
        │   └── 大模型代理（场景对话）
        └── PostgreSQL + S3
```

**离线优先策略：** SQLite 为主数据源。同步在 App 启动时及有网络时触发，冲突以最新 `updated_at` 时间戳为准。

---

## 数据模型

```
User（用户）
  id, email, nickname, avatar_url
  level, total_xp, streak_count, last_study_date
  league_tier（青铜/白银/黄金/铂金/钻石）
  created_at, updated_at

Word（单词）
  id, user_id
  english, phonetic, chinese, example_sentence
  source（视频 | 拍图 | 手动 | 阅读）
  accuracy_rate（浮点 0.0–1.0）
  review_count, next_review_date
  created_at, updated_at

FlashCard（闪卡）
  id, word_id
  difficulty（0–5，SM-2 算法）
  last_reviewed, next_review

VideoHistory（观影历史）
  id, user_id
  title, source（本地 | 在线）, url
  last_position_ms, subtitle_path
  created_at

Scene（场景）
  id, name_cn, name_en
  is_preset（布尔值）
  dialogues（JSON 数组：[{english, chinese}]）
  created_at

Article（文章）
  id, user_id
  title, source_url, content
  word_count, unknown_word_count
  last_read_position, is_finished
  created_at

DailyGoal（每日目标）
  id, user_id
  target_words, target_minutes
  xp_earned, completed_date

LeagueWeek（联赛周，仅服务端，不同步至本地 SQLite）
  id, user_id, week_start_date
  tier, weekly_xp, rank
```

---

## 功能模块

### 1. 美剧学习

- **本地视频：** 用户导入 mp4/mkv，FFmpeg 提取内嵌 SRT/ASS 字幕。
- **在线视频：** 用户粘贴 YouTube 链接，youtube_explode_dart 获取视频及 CC 字幕。（受 YouTube 服务条款约束；备选方案：用户手动上传 SRT 文件。）
- **播放界面：** 视频播放器 + 中英双语字幕叠加。点击任意单词 → 弹出音标、释义、例句 + "加入单词本"按钮。
- **已知词高亮：** 单词本中已有的词在字幕中高亮显示。
- **经验值：** 按观看时长 + 添加单词数计算。

### 2. 单词本

- 完整词汇列表，支持搜索和按来源筛选（视频 / 拍图 / 手动 / 阅读）。
- 每张单词卡：英文、音标、中文释义、例句、发音按钮。
- 每词熟练度进度条（红 → 橙 → 绿），基于 `accuracy_rate`。
- 基于艾宾浩斯遗忘曲线，通过本地通知发送间隔重复复习提醒。

### 3. 单词对对碰

- 从单词本中按加权随机选词。
- **权重公式：** `weight = 1 - accuracy_rate`，未复习的词获最高权重。
- 游戏界面：左侧英文卡，右侧中文卡，点击配对。
- 限时模式 + 计分器。
- 卡通反馈：正确 → 粒子爆炸 + 星星；错误 → 屏幕抖动 + 红色闪烁。
- 每局结束后更新所有参与单词的 `accuracy_rate`，熟练度进度条实时刷新。
- **经验值：** 每次配对正确均获得奖励。

### 4. 拍图识词

- 拍照或从相册选图 → ML Kit OCR → 生成单词列表。
- 点击单个单词 → 释义弹窗。
- "全部加入单词本"按钮。
- 自动从识别的单词生成闪卡组。
- 闪卡复习：右滑（已知）/ 左滑（未知），SM-2 间隔重复算法安排下次复习。

### 5. 场景英语

- 文本输入框：用户输入场景（如"餐厅点餐"、"求职面试"）。
- 匹配逻辑：
  - 命中预设库 → 立即返回缓存对话（离线可用）。
  - 无匹配 → 调用大模型 API → 生成 8–12 条对话 → 本地缓存为 `Scene` 记录。
- 对话列表：英文句子 + 中文翻译 + 发音按钮。
- 点击对话中的单词 → 释义弹窗 + 加入单词本。
- 收藏场景 → 离线保存以供日后使用。
- **预设库：** 50+ 场景（机场、餐厅、酒店、面试、购物、医院、问路、电话、商务会议、日常闲聊等）。

### 6. AI 发音评分

- 入口：任意字幕句子（美剧模块）或任意对话句（场景模块）。
- 点击麦克风 → 录音用户跟读该句子。
- 提交至 Azure Speech SDK / 科大讯飞进行评估。
- 结果：总分（0–100）+ 单词维度得分 + 弱音素高亮（红色）。
- 满分（≥95）→ 额外经验值 + 彩带动画。

### 7. 沉浸式阅读

- 用户粘贴文章链接或原始文本。
- App 解析并展示干净的阅读视图。
- 点击任意单词 → 释义弹窗 + 加入单词本。
- 自动保存阅读进度。
- 文章统计：总词数、生词数、预估难度等级。
- 读完整篇文章 → 经验值奖励。

### 8. 联赛排行榜

- 用户按经验值段位自动分配至 20 人联赛。
- 周赛制（周一至周日）：按当周经验值在联赛内排名。
- 每周日晚结算：
  - 前 3 名 → 晋升至上一段位。
  - 后 5 名 → 降至下一段位。
- 段位：青铜 → 白银 → 黄金 → 铂金 → 钻石。
- 好友列表：关注其他用户，查看其排名和连签数。
- **全模块经验值来源：** 观看视频、添加单词、对对碰游戏、闪卡复习、发音练习、阅读文章。

### 9. 奖励系统

- **连签：** 任意学习活动 ≥5 分钟计为当日打卡。火焰图标显示天数，断签归零。
- **经验值与等级：** 累计经验值驱动等级提升，每级解锁新卡通头像框或 App 主题色。
- **每日目标：** 用户设置每日目标（如"学习 10 个单词"），首页显示进度条，达成目标 → 额外经验值。
- **成就徽章：** 里程碑勋章（如"7 天连签"、"学会 100 个单词"、"首次发音满分"）。

---

## 后端 API 接口

```
POST   /auth/register         # 注册
POST   /auth/login            # 登录
POST   /auth/refresh          # 刷新令牌

GET    /user/profile          # 获取用户资料
PUT    /user/streak           # 更新连签
PUT    /user/xp               # 更新经验值

POST   /words/sync            # 从本地 SQLite 批量同步
GET    /words                 # 拉取云端单词列表
PUT    /words/:id/accuracy    # 游戏结束后更新熟练度

GET    /review/queue          # 今日间隔重复复习队列

GET    /league/current        # 用户当前联赛及排名
GET    /league/friends        # 关注用户的统计数据

POST   /scene/generate        # 大模型代理生成场景对话
GET    /scene/presets         # 获取预设场景列表
```

---

## 导航结构

底部标签栏（6 个标签）：

```
[首页] [单词本] [对对碰] [场景] [阅读] [我的]
```

首页展示：连签 + 经验值进度条 + 每日目标进度 + 快速恢复上次视频 + 推荐复习单词。

拍图识词和美剧学习从首页及单词本上下文入口访问（不设独立标签，保持导航简洁）。

---

## UI 风格

- 卡通扁平设计，大圆角，高饱和度配色。
- 主色调：橙黄（活力）+ 深蓝（专注）。
- 支持深色模式。
- 吉祥物：卡通猫头鹰或外星人伙伴，任务完成时触发小动画。
- 全局微动效：获得经验值时数字飞升，升级触发全屏彩带 + 吉祥物跳跃。

---

## 测试策略

- **单元测试：** 单词权重算法、间隔重复调度、经验值计算。
- **Widget 测试：** 游戏棋盘、闪卡滑动、字幕叠加层。
- **集成测试：** 同步流程（本地 → 后端 → 拉取）、OCR → 闪卡流水线。
- **手动测试：** 每次发布前在 Android 和 iOS 模拟器上完整走通各模块黄金路径。
