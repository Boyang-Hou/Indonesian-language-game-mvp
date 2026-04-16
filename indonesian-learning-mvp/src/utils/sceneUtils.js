// ─── validateScene ───────────────────────────────────────────────────────────

/**
 * 校验单个场景数据的必填字段，并对 vocab_hints 中的重复词语去重。
 * @param {object} scene
 * @returns {boolean} 校验通过返回 true，否则返回 false
 */
export function validateScene(scene) {
  const required = ['scene_id', 'chapter', 'background_style', 'dialogues']
  for (const field of required) {
    if (scene[field] == null) {
      console.error(
        `[Scene Error] 场景 "${scene.scene_id ?? '未知'}" 缺少必填字段: ${field}`
      )
      return false
    }
  }

  // 对每轮对话的 vocab_hints 去重（同一对话轮内相同 word 只保留第一条）
  if (Array.isArray(scene.dialogues)) {
    scene.dialogues.forEach((dialogue) => {
      if (Array.isArray(dialogue.vocab_hints)) {
        const seen = new Set()
        dialogue.vocab_hints = dialogue.vocab_hints.filter((hint) => {
          const key = hint.word?.toLowerCase()
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }
    })
  }

  return true
}

// ─── getInitialSceneId ───────────────────────────────────────────────────────

/**
 * 从 sessionStorage 读取上次的场景 ID，验证有效后返回；否则返回第一个场景的 ID。
 * @param {object[]} scenes
 * @returns {string}
 */
export function getInitialSceneId(scenes) {
  try {
    const saved = sessionStorage.getItem('current_scene_id')
    if (saved && scenes.find((s) => s.scene_id === saved)) {
      return saved
    }
  } catch {
    // sessionStorage 不可用（如隐私模式限制）时静默降级
  }
  return scenes[0].scene_id
}

// ─── trackEvent ──────────────────────────────────────────────────────────────

/**
 * Umami 埋点容错封装。window.umami 不存在或抛出异常时静默处理。
 * @param {string} name  事件名称
 * @param {object} [props] 事件属性
 */
export function trackEvent(name, props) {
  try {
    if (typeof window !== 'undefined' && typeof window.umami !== 'undefined') {
      window.umami.track(name, props)
    }
  } catch (e) {
    console.warn('[Umami] 埋点上报失败:', e)
  }
}
