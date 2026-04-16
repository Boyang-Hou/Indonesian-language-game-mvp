# 需求文档

## 简介

本项目是一个印尼语沉浸式学习平台的 MVP Demo，采用视觉小说式的场景对话形式，帮助初学者通过沉浸式体验学习印尼语。Demo 阶段目标是以最小成本验证核心假设：**用视觉小说式的沉浸场景对话学印尼语，比现有资源更让初学者愿意继续。**

Demo 为纯前端应用，数据 hardcode 在本地 JSON 文件中，部署至 Vercel，生成可分享链接供 5-10 名测试用户体验。验证周期为 8 周，止损线为完成率 < 15% 且零自传播。

## 词汇表

- **App**：印尼语沉浸式学习平台前端应用
- **Scene（场景）**：一个完整的对话单元，包含背景、多轮对话和选项，对应 `scenes.json` 中的一条记录
- **Dialogue（对话轮）**：场景中的单条对话，包含角色名、印尼语文本、中文对照及生词提示
- **VocabHint（生词提示）**：附加在对话轮上的词汇注释，包含词语、词义、词根拆解和文化钩子
- **HighlightedWord（高亮词）**：印尼语文本中被 `vocab_hints` 标注、以特殊样式显示的词语
- **VocabPopup（生词弹窗）**：点击高亮词后弹出的浮层，展示词义、词根拆解和文化钩子
- **ChoicePanel（选项面板）**：场景最后一轮对话结束后展示的 2-3 个跳转选项
- **EndingCard（结尾卡片）**：第一章最后一个场景（场景 5）专属的悬念钩子展示区域，替代选项面板
- **Chapter（章节）**：由多个场景组成的叙事单元，Demo 阶段仅包含第一章（5 个场景）
- **SceneView**：场景主容器组件，负责渲染背景、对话列表、选项面板或结尾卡片
- **DialogueBox**：对话展示组件，渲染角色名、印尼语文本（含高亮词）和中文对照
- **VocabHighlight**：高亮词组件，负责在印尼语文本中识别并渲染可点击的高亮词
- **scenes.json**：存储全部 5 个场景数据的本地 JSON 文件，词汇释义数据通过各场景 `vocab_hints` 字段内联存储，无独立词汇库文件
- **Umami**：轻量级匿名网站统计服务，用于采集用户行为事件，不采集任何个人信息
- **LocationLabel（地点标签）**：场景地点的简短描述文本，取自场景数据的 `location_label` 字段，显示在场景顶部；该字段为可选，缺省时不显示地点标签
- **ChoiceResponse（选项回应）**：用户选择某个选项后 NPC 的回应对话，在下一场景第一轮对话前插入显示；取自 choice 数据的 `response` 字段，该字段为可选
- **ChallengeChoice（语言挑战选项）**：`type` 为 `"challenge"` 的选项，三个选项呈现同一意思的不同印尼语表达方式，包含正确/错误标记（`correct` 字段）和 NPC 纠正回应（`response` 字段）

---

## 需求

### 需求 1：场景数据加载与渲染

**用户故事：** 作为初学者，我希望进入应用后能看到场景背景和第一轮对话，以便立刻进入沉浸式学习状态。

#### 验收标准

1. THE App SHALL 从本地 `scenes.json` 文件中加载全部 5 个场景的数据，无需任何网络请求。
2. WHEN 用户进入应用，THE SceneView SHALL 渲染当前场景的 CSS 渐变背景色（取自场景数据的 `background_style` 字段）。
3. WHEN 场景加载完成，THE SceneView SHALL 展示该场景第一轮对话，包含角色名、印尼语文本和中文对照。
4. THE App SHALL 支持以下 5 个场景，按顺序构成第一章：`jakarta_nightmarket_01`、`jakarta_market_02`、`jakarta_warung_03`、`jakarta_cny_04`、`jakarta_chinatown_05`。
5. IF 场景数据中某个必填字段（`scene_id`、`chapter`、`background_style`、`dialogues`）缺失，THEN THE App SHALL 在控制台输出错误信息并停止渲染该场景。

---

### 需求 2：多轮对话逐步推进

**用户故事：** 作为学习者，我希望通过点击来逐步推进对话，以便按自己的节奏阅读和理解每一轮内容。

#### 验收标准

1. WHEN 用户点击"继续"按钮或点击对话区域，THE DialogueBox SHALL 将下一轮对话追加显示在当前对话列表末尾。
2. WHILE 场景中仍有未展示的对话轮，THE App SHALL 保持"继续"按钮或可点击区域处于可交互状态。
3. THE DialogueBox SHALL 以聊天记录式布局保留所有已展示的对话轮，新对话追加在下方，已展示内容不消失。
4. WHEN 场景中最后一轮对话展示完毕，THE App SHALL 隐藏"继续"按钮并展示 ChoicePanel 或 EndingCard。
5. THE DialogueBox SHALL 在每轮对话中同时展示角色名、印尼语文本和中文对照三个元素。

---

### 需求 3：生词高亮显示

**用户故事：** 作为学习者，我希望印尼语文本中的重点词汇以特殊样式突出显示，以便快速识别需要关注的词语。

#### 验收标准

1. THE VocabHighlight SHALL 解析每轮对话的 `vocab_hints` 数组，将其中 `word` 字段对应的词语在印尼语文本中以下划线加强调色样式渲染。
2. THE VocabHighlight SHALL 对印尼语文本进行大小写不敏感的词语匹配，确保高亮词被正确识别。
3. WHILE 对话轮处于展示状态，THE VocabHighlight SHALL 持续保持高亮词的特殊样式，不因页面滚动或新对话追加而消失。
4. IF 某轮对话的 `vocab_hints` 为空数组，THEN THE VocabHighlight SHALL 将该轮印尼语文本以普通样式渲染，不产生任何高亮效果。
5. THE VocabHighlight SHALL 仅对 `vocab_hints` 中明确标注的词语应用高亮样式，其余词语保持普通样式。

---

### 需求 4：生词弹窗交互

**用户故事：** 作为学习者，我希望点击高亮词后能看到词义、词根拆解和文化背景，以便深入理解词汇含义。

#### 验收标准

1. WHEN 用户点击高亮词，THE VocabPopup SHALL 弹出浮层，展示该词的词义（`meaning`）、词根拆解（`root`）和文化钩子（`culture_hook`）三项内容。
2. WHEN 用户点击弹窗外部区域，THE VocabPopup SHALL 关闭并从界面中移除。
3. WHEN 用户点击弹窗内的关闭按钮，THE VocabPopup SHALL 关闭并从界面中移除。
4. WHILE 弹窗处于展示状态，THE App SHALL 确保同一时刻最多只有一个 VocabPopup 处于打开状态；WHEN 用户点击另一个高亮词，THE VocabPopup SHALL 切换为新词的内容。
5. WHEN 用户点击非高亮词的普通文本区域，THE App SHALL 不触发任何弹窗。

---

### 需求 5：场景选项与跳转

**用户故事：** 作为学习者，我希望在每个场景结束时能选择不同的选项跳转到下一场景，以便体验沉浸式叙事。

#### 验收标准

1. WHEN 场景最后一轮对话展示完毕且该场景的 `choices` 数组不为空，THE ChoicePanel SHALL 展示 2-3 个选项按钮，每个按钮文本格式为"印尼语（中文注释）"。
2. WHEN 用户点击某个选项，THE App SHALL 加载该选项 `next` 字段对应的场景并从第一轮对话开始渲染。
3. THE ChoicePanel SHALL 展示场景数据 `choices` 数组中的全部选项，不遗漏、不重复。
4. WHILE ChoicePanel 处于展示状态，THE App SHALL 禁用"继续"按钮，防止用户在选择前继续推进。
5. IF 场景数据的 `choices` 数组为空，THEN THE App SHALL 不渲染 ChoicePanel，转而渲染 EndingCard。
6. THE App SHALL 按线性顺序排列 5 个场景（场景 1→2→3→4→5）；同一场景内的多个选项文本各不相同，但所有选项的 `next` 字段均指向同一个下一场景，内容编写者无需为每个选项编写不同的分支路径。
7. THE App SHALL 将"完成率"定义为：到达场景 5（`jakarta_chinatown_05`）并看到 EndingCard 的用户占所有进入场景 1 用户的比例。
8. WHEN 用户点击含 `response` 字段的选项，THE App SHALL 在下一场景第一轮对话前插入一条 ChoiceResponse 对话，渲染完毕后清空该状态。
9. WHEN choice 的 `type` 为 `"challenge"` 且 `correct` 为 `true`，THE ChoiceResponse 对话框 SHALL 以绿色点缀渲染，表示 NPC 夸奖回应。
10. WHEN choice 的 `type` 为 `"challenge"` 且 `correct` 为 `false`，THE ChoiceResponse 对话框 SHALL 以橙色点缀渲染，表示 NPC 温柔纠正回应。
11. IF choice 无 `response` 字段，THEN THE App SHALL 直接跳转场景，不插入任何额外对话，与现有逻辑完全一致。

---

### 需求 6：第一章结尾悬念展示

**用户故事：** 作为学习者，我希望在完成第一章后看到悬念钩子，以便对后续内容产生期待。

#### 验收标准

1. WHEN 场景 `jakarta_chinatown_05` 的最后一轮对话展示完毕，THE SceneView SHALL 渲染 EndingCard，而非 ChoicePanel。
2. THE EndingCard SHALL 展示场景数据 `ending` 字段中的标题（`title`）、正文（`text`）和行动号召按钮（`cta_text`），告知用户"第二章即将到来"。
3. THE EndingCard SHALL 将 `cta_text` 字段内容渲染为一个可点击按钮；WHEN 用户点击该按钮，THE App SHALL 重置应用状态并跳转回场景 `jakarta_nightmarket_01` 的第一轮对话。
4. THE EndingCard SHALL 替代选项面板占据屏幕下方区域，与对话记录区域在视觉上明确区分。
5. WHILE EndingCard 处于展示状态，THE App SHALL 不展示任何跳转选项或"继续"按钮。

---

### 需求 7：视觉风格与界面布局

**用户故事：** 作为学习者，我希望界面具备沉浸式视觉小说风格，以便获得良好的阅读体验。

#### 验收标准

1. THE App SHALL 为每个场景应用 `background_style` 字段中定义的 CSS 渐变色作为全屏背景，通过颜色传递场景氛围。
2. THE DialogueBox SHALL 以深色半透明底色配白色文字渲染对话框，参考视觉小说风格。
3. THE App SHALL 以角色名文字标签区分不同说话人，不使用角色头像或立绘图片。
4. THE App SHALL 使用 Tailwind CSS 实现所有样式，不引入额外 CSS 框架。
5. THE App SHALL 在移动端（屏幕宽度 ≥ 375px）和桌面端（屏幕宽度 ≥ 1024px）均保持可读、可交互的布局。
6. THE App SHALL 在场景切换时应用 0.5 秒淡入淡出过渡动画（CSS transition）。
7. WHEN 场景数据包含 `location_label` 字段，THE SceneView SHALL 在场景顶部显示地点标签；IF 场景数据不包含 `location_label` 字段，THEN THE SceneView SHALL 不显示地点标签区域。
8. THE App SHALL 提供全局"显示/隐藏中文"开关（默认隐藏）；WHEN 开关关闭时，THE DialogueBox SHALL 将中文对照以模糊样式隐藏；WHEN 用户点击模糊区域，THE DialogueBox SHALL 揭示该轮对话的中文对照。

---

### 需求 8：场景内容数据规范

**用户故事：** 作为内容创作者，我希望场景数据遵循统一的 JSON 结构，以便快速填写和维护脚本。

#### 验收标准

1. THE App SHALL 支持以下普通场景 JSON 结构：包含 `scene_id`（字符串）、`chapter`（数字）、`background_style`（CSS 字符串）、`dialogues`（数组，每项含 `character`、`indo`、`zh`、`vocab_hints`）、`choices`（数组，每项含 `label`、`next`，以及可选字段 `type`、`correct`、`response`）。
2. THE App SHALL 支持结尾场景（场景 5）在上述结构基础上新增 `ending` 字段，包含 `title`、`text`、`cta_text` 三个子字段，且 `choices` 为空数组；`cta_text` 存储按钮文字内容，按钮点击行为由前端逻辑固定实现。
3. THE App SHALL 仅使用 `scenes.json` 作为词汇数据来源，所有词汇释义通过各场景 `dialogues` 中的 `vocab_hints` 字段内联存储，不存在独立的 `vocabulary.json` 文件。
4. THE App SHALL 支持每个场景包含 5-8 轮对话（`dialogues` 数组长度为 5 至 8）。
5. THE App SHALL 支持每轮对话的 `vocab_hints` 数组包含零个或多个生词提示，每条提示包含 `word`、`meaning`、`root`、`culture_hook` 四个字段。
6. THE App SHALL 在第一章 5 个场景的脚本中，确保以下高频词的出现次数满足复现目标：`goreng` ≥ 6 次、`makan` ≥ 5 次、`berapa` ≥ 4 次、`enak` ≥ 4 次、`mau` ≥ 5 次。
7. THE App SHALL 支持 `Choice` 数据结构中的以下可选字段：`type`（`"story"` 或 `"challenge"`，缺省为 `"story"`）、`correct`（布尔值，仅 `challenge` 类型使用）、`response`（字符串，选择后 NPC 的回应文本）；缺省时行为与现有逻辑完全一致，向后兼容。
8. THE App SHALL 支持 `SceneData` 数据结构中的可选字段 `location_label`（字符串），用于在场景顶部显示地点标签；缺省时不影响任何现有渲染逻辑。

---

### 需求 9：Vercel 部署与可分享链接

**用户故事：** 作为项目发起人，我希望将 Demo 部署到 Vercel 并获得可分享链接，以便发送给测试用户收集反馈。

#### 验收标准

1. THE App SHALL 构建为静态前端产物（无需服务端运行时），可直接部署至 Vercel。
2. WHEN 代码推送至主分支，THE App SHALL 通过 Vercel 自动部署流程生成一个可公开访问的 HTTPS 链接。
3. THE App SHALL 在无需用户注册、登录或任何账号操作的情况下，通过该链接直接可用。
4. WHEN 用户在同一标签页内进行场景导航，THE App SHALL 将当前场景 ID 存储至 `sessionStorage` 的 `current_scene_id` 键，并在页面内导航时从该键恢复进度。
5. WHEN 用户关闭标签页或浏览器，THE App SHALL 自动清除 `sessionStorage` 中的进度数据，不向 `localStorage` 或 Cookie 写入任何持久化数据。
6. IF 用户刷新页面且 `sessionStorage` 中不存在 `current_scene_id`，THEN THE App SHALL 从第一个场景重新开始。

---

### 需求 10：匿名埋点数据采集

**用户故事：** 作为项目发起人，我希望收集匿名用户行为数据，以便在 8 周验证期结束后基于完成率数据做决策。

#### 验收标准

1. THE App SHALL 接入 Umami 统计服务，通过其提供的脚本标签在页面加载时初始化，不采集任何个人身份信息。
2. WHEN 用户进入任意场景，THE App SHALL 向 Umami 上报一个名为 `enter_scene` 的自定义事件，携带当前 `scene_id` 作为事件属性。
3. WHEN 用户到达场景 `jakarta_chinatown_05` 并看到 EndingCard，THE App SHALL 向 Umami 上报一个名为 `complete_chapter_1` 的自定义事件。
4. THE App SHALL 仅上报上述两类事件，不上报任何其他用户操作或页面内容数据。
5. IF Umami 脚本加载失败，THEN THE App SHALL 继续正常运行，不因埋点异常影响用户体验。
