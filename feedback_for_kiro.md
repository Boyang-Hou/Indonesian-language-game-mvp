# 反馈：两个需要修复的问题

---

## 问题 1：中文隐藏功能不生效（Bug）

### 现象

全局"显示/隐藏中文"开关存在，但切换后中文对照文本没有变模糊，始终以明文显示。用户无法体验"先猜再揭示"的学习模式。

### 期望行为（对照需求 7.8 和 design.md）

1. App 层维护 `showTranslation` 状态，**默认值必须为 `false`**（即默认隐藏中文）。
2. 当 `showTranslation === false` 时，DialogueBox 中的中文对照（`dialogue.zh`）应用 Tailwind 的 `blur-sm` 类，文字视觉上模糊不可读。
3. 用户点击某条模糊的中文文本，该条揭示（DialogueBox 内部 `revealed` 本地状态变为 `true`），其他对话框不受影响。
4. 当用户切换全局开关为"显示中文"（`showTranslation === true`），所有对话框中文直接显示，不需要逐条点击。
5. 再切回"隐藏中文"时，已揭示的条目应重新模糊（`revealed` 状态重置）。

### 排查方向

请按以下顺序检查代码：

**检查点 A：App.jsx 的 `showTranslation` 初始值**
```js
// 必须是 false，不是 true
const [showTranslation, setShowTranslation] = useState(false)
```
如果初始值是 `true`，所有中文默认显示，toggle 开关看起来"不生效"。

**检查点 B：`showTranslation` prop 是否正确传递到 DialogueBox**
```
App → SceneView → DialogueBox
```
确认 SceneView 将 `showTranslation` 传递给每个 DialogueBox，而不是遗漏了这个 prop。

**检查点 C：DialogueBox 中的条件渲染逻辑**
```jsx
// 正确写法：
const [revealed, setRevealed] = useState(false)

<p
  className={showTranslation || revealed ? "text-gray-300 text-sm mt-1" : "text-gray-300 text-sm mt-1 blur-sm cursor-pointer select-none"}
  onClick={() => { if (!showTranslation && !revealed) setRevealed(true) }}
>
  {dialogue.zh}
</p>
```
常见错误：
- 条件写反了（`!showTranslation` 和 `showTranslation` 搞混）
- `blur-sm` 没有在 Tailwind 中生效（检查 `tailwind.config.js` 是否包含 blur 相关配置，Tailwind v3 默认支持）
- `className` 写成了 `class`（React 中必须用 `className`）
- `revealed` 状态没有用 `useState` 声明

**检查点 D：`revealed` 在场景切换时是否重置**
当 `showTranslation` 从 `true` 切回 `false` 时，每个 DialogueBox 的 `revealed` 应重置为 `false`。可以通过 `useEffect` 监听 `showTranslation` 变化来实现：
```jsx
useEffect(() => {
  if (!showTranslation) setRevealed(false)
}, [showTranslation])
```

**检查点 E：全局 toggle 按钮是否调用了 `onToggleTranslation`**
确认 toggle 按钮的 onClick 绑定了 `() => setShowTranslation(prev => !prev)` 或等效逻辑，而不是空函数。

---

## 问题 2：选项回应应在当前场景显示后再跳转（设计变更）

### 现象

当前实现：用户选了一个选项 → 立刻跳转到下一场景 → NPC 回应显示在新场景的第一轮对话前面。

### 问题

这破坏了对话的自然感。例如：用户在夜市摊位选了"Berapa harga?（多少钱？）"，摊贩 Pak Budi 应该当场回答，而不是换到菜市场场景后才回答。回应和场景上下文脱节了。

### 期望行为

用户选了选项 → **NPC 回应在当前场景内追加显示** → 用户看到回应后点击"继续"或等待短暂延迟 → 然后跳转到下一场景。

### 具体交互流程

```
1. 场景最后一轮对话展示完毕
2. ChoicePanel 显示 2-3 个选项
3. 用户点击选项 A
4. ChoicePanel 隐藏
5. 在当前场景的对话列表末尾追加一条 ChoiceResponse 对话框，
   显示 NPC 对选项 A 的回应（response 字段内容）
   - correct === true → 绿色点缀（NPC 夸奖）
   - correct === false → 橙色点缀（NPC 温柔纠正）
   - response 不存在 → 不追加，直接跳转（向后兼容）
6. 同时显示"继续"按钮（或 1.5 秒后自动跳转）
7. 用户点击"继续" → 执行场景跳转（淡出当前场景 → 淡入新场景）
```

### 需要修改的组件和状态

**App.jsx 状态变更：**
```
删除：lastChoiceResponse（不再需要跨场景传递回应）
新增：pendingResponse: { text: string, isCorrect: boolean | null } | null
新增：pendingNextScene: string | null
```

**新的流程逻辑（App.jsx）：**
```js
// 用户点击选项时（由 ChoicePanel 触发）
function handleChoiceSelect(nextSceneId, response, isCorrect) {
  if (response) {
    // 有回应：先存下回应和目标场景，不立即跳转
    setPendingResponse({ text: response, isCorrect })
    setPendingNextScene(nextSceneId)
  } else {
    // 无回应：直接跳转（保持现有行为）
    navigateTo(nextSceneId)
  }
}

// 用户看完回应后点击"继续"（由 SceneView 触发）
function handleResponseContinue() {
  const next = pendingNextScene
  setPendingResponse(null)
  setPendingNextScene(null)
  navigateTo(next)
}
```

**SceneView.jsx 渲染逻辑变更：**
```
const visibleDialogues = scene.dialogues.slice(0, dialogueIndex)
const isFinished = dialogueIndex >= scene.dialogues.length
const showChoices = isFinished && scene.choices.length > 0 && !pendingResponse
const showEnding  = isFinished && scene.choices.length === 0 && scene.ending != null

return (
  <div style={background: scene.background_style}>
    {scene.location_label && <LocationLabel text={scene.location_label} />}

    {visibleDialogues.map(d => <DialogueBox ... />)}

    {/* NPC 回应：追加在当前场景对话末尾 */}
    {pendingResponse && (
      <ChoiceResponseBox response={pendingResponse} />
    )}

    {/* 底部操作区 */}
    {!isFinished && !pendingResponse && <button onClick={onAdvance}>继续</button>}
    {pendingResponse && <button onClick={onResponseContinue}>继续</button>}
    {showChoices && <ChoicePanel ... />}
    {showEnding  && <EndingCard ... />}
  </div>
)
```

**ChoicePanel.jsx 变更：**
```
// onClick 不再直接调用 navigateTo，改为调用 handleChoiceSelect
<button onClick={() => onChoiceSelect(c.next, c.response, c.type === 'challenge' ? c.correct : null)}>
  {c.label}
</button>
```

**ChoiceResponseBox 组件（新建或复用 DialogueBox 样式）：**
```
渲染一条对话框，角色名取当前场景最后一个说话的 NPC 角色名（非"你"的角色）
- isCorrect === true：对话框左侧加绿色竖条
- isCorrect === false：对话框左侧加橙色竖条
- isCorrect === null：正常样式（story 类型选项）
```

### 涉及的需求变更

以下需求条款需要对应更新：

- **需求 5.8**：原文"在下一场景第一轮对话前插入"→ 改为"在当前场景对话列表末尾追加"
- **需求 5.9、5.10**：渲染位置从"下一场景开头"改为"当前场景末尾"
- **design.md**：App 状态模型中 `lastChoiceResponse` 替换为 `pendingResponse` + `pendingNextScene`；SceneView 渲染逻辑伪代码更新；删除 `navigateTo` 的 response 参数

### 向后兼容

- 如果 choice 没有 `response` 字段，行为与现在完全一致（直接跳转）
- scenes.json 数据结构不需要任何改动
- 只是前端渲染时机变了：从"跳转后显示"变为"跳转前显示"

---

## 修复优先级

1. **问题 1（中文隐藏）**：先修，排查量小，大概率是 prop 传递或初始值的问题
2. **问题 2（回应时机）**：后修，涉及状态管理流程变更，但逻辑清晰，不复杂
