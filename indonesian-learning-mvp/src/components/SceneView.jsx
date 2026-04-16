import { useEffect, useRef, useState } from 'react'
import DialogueBox from './DialogueBox'
import ChoicePanel from './ChoicePanel'
import EndingCard from './EndingCard'

export default function SceneView({
  scene,
  dialogueIndex,
  onAdvance,
  onChoiceSelect,
  onResponseContinue,
  onRestart,
  onWordClick,
  onCompleteChapter,
  showTranslation,
  pendingResponse,
}) {
  const visibleDialogues = scene.dialogues.slice(0, dialogueIndex)
  const isFinished = dialogueIndex >= scene.dialogues.length
  // 有 pendingResponse 时隐藏选项面板，等用户看完回应再跳转
  const showChoices = isFinished && scene.choices.length > 0 && !pendingResponse
  const showEnding = isFinished && scene.choices.length === 0 && !!scene.ending

  // 淡入动画
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [scene.scene_id])

  // complete_chapter_1 埋点防重复
  const hasTrackedEnding = useRef(false)
  useEffect(() => {
    if (showEnding && !hasTrackedEnding.current) {
      hasTrackedEnding.current = true
      onCompleteChapter()
    }
  }, [showEnding, onCompleteChapter])
  useEffect(() => { hasTrackedEnding.current = false }, [scene.scene_id])

  // 找当前场景最后一个 NPC 角色名（非"你"）
  const lastNpcCharacter = [...scene.dialogues]
    .reverse()
    .find((d) => !d.character.includes('你'))?.character ?? 'NPC'

  return (
    <div
      className="min-h-screen flex flex-col transition-opacity duration-500"
      style={{ background: scene.background_style, opacity: visible ? 1 : 0 }}
    >
      {/* 地点标签 */}
      {scene.location_label && (
        <div className="px-4 pt-4 max-w-2xl w-full mx-auto">
          <span className="inline-block bg-black/40 backdrop-blur-sm text-white/80 text-xs px-3 py-1 rounded-full border border-white/20">
            {scene.location_label}
          </span>
        </div>
      )}

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 max-w-2xl w-full mx-auto">
        {visibleDialogues.map((dialogue, i) => (
          <DialogueBox
            key={i}
            dialogue={dialogue}
            onWordClick={onWordClick}
            showTranslation={showTranslation}
          />
        ))}

        {/* NPC 回应：追加在当前场景对话末尾 */}
        {pendingResponse && (
          <div
            className={`rounded-xl px-5 py-4 mb-3 border-l-4 bg-black/70 backdrop-blur-sm border border-white/10 ${
              pendingResponse.isCorrect === true
                ? 'border-l-green-400'
                : pendingResponse.isCorrect === false
                ? 'border-l-orange-400'
                : 'border-l-yellow-400'
            }`}
          >
            <span className={`inline-block text-xs font-semibold tracking-wide uppercase mb-2 ${
              pendingResponse.isCorrect === true
                ? 'text-green-400'
                : pendingResponse.isCorrect === false
                ? 'text-orange-400'
                : 'text-yellow-400'
            }`}>
              {lastNpcCharacter}
            </span>
            <p className="text-white text-base leading-relaxed">
              {pendingResponse.text}
            </p>
          </div>
        )}
      </div>

      {/* 底部操作区 */}
      <div className="px-4 pb-8 max-w-2xl w-full mx-auto">
        {/* 正常推进按钮 */}
        {!isFinished && !pendingResponse && (
          <button
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-xl py-3 transition-colors duration-200"
            onClick={onAdvance}
          >
            继续
          </button>
        )}

        {/* 看完 NPC 回应后的继续按钮 */}
        {pendingResponse && (
          <button
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-xl py-3 transition-colors duration-200"
            onClick={onResponseContinue}
          >
            继续
          </button>
        )}

        {showChoices && (
          <ChoicePanel choices={scene.choices} onChoiceSelect={onChoiceSelect} />
        )}

        {showEnding && (
          <EndingCard ending={scene.ending} onRestart={onRestart} />
        )}
      </div>
    </div>
  )
}
