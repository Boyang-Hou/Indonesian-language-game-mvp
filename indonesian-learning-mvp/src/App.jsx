import { useState, useCallback } from 'react'
import scenesData from './data/scenes.json'
import { validateScene, getInitialSceneId, trackEvent } from './utils/sceneUtils'
import SceneView from './components/SceneView'
import VocabPopup from './components/VocabPopup'
import './App.css'

const validScenes = scenesData.filter(validateScene)

function App() {
  const [currentSceneId, setCurrentSceneId] = useState(
    () => getInitialSceneId(validScenes)
  )
  const [dialogueIndex, setDialogueIndex] = useState(1)
  const [activeHint, setActiveHint] = useState(null)
  const [showTranslation, setShowTranslation] = useState(false)

  // 问题 2：回应在当前场景显示，跳转前等用户点继续
  const [pendingResponse, setPendingResponse] = useState(null)  // { text, isCorrect }
  const [pendingNextScene, setPendingNextScene] = useState(null)

  const currentScene = validScenes.find((s) => s.scene_id === currentSceneId)

  // 纯场景跳转（无回应）
  const navigateTo = useCallback((sceneId) => {
    setCurrentSceneId(sceneId)
    setDialogueIndex(1)
    setPendingResponse(null)
    setPendingNextScene(null)
    try { sessionStorage.setItem('current_scene_id', sceneId) } catch {}
    trackEvent('enter_scene', { scene_id: sceneId })
  }, [])

  // 用户点击选项
  const handleChoiceSelect = useCallback((nextSceneId, response, isCorrect) => {
    if (response) {
      // 有回应：先在当前场景显示，等用户点继续再跳转
      setPendingResponse({ text: response, isCorrect: isCorrect ?? null })
      setPendingNextScene(nextSceneId)
    } else {
      // 无回应：直接跳转
      navigateTo(nextSceneId)
    }
  }, [navigateTo])

  // 用户看完回应后点"继续"
  const handleResponseContinue = useCallback(() => {
    const next = pendingNextScene
    setPendingResponse(null)
    setPendingNextScene(null)
    navigateTo(next)
  }, [pendingNextScene, navigateTo])

  const handleAdvance = useCallback(() => {
    if (!currentScene) return
    setDialogueIndex((prev) =>
      prev < currentScene.dialogues.length ? prev + 1 : prev
    )
  }, [currentScene])

  const handleRestart = useCallback(() => navigateTo(validScenes[0].scene_id), [navigateTo])

  const handleCompleteChapter = useCallback(() => {
    trackEvent('complete_chapter_1')
  }, [])

  const handleWordClick = useCallback((hint) => setActiveHint(hint), [])
  const handlePopupClose = useCallback(() => setActiveHint(null), [])
  const handleToggleTranslation = useCallback(() => setShowTranslation((p) => !p), [])

  if (!currentScene) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>场景数据加载失败，请检查 scenes.json。</p>
      </div>
    )
  }

  return (
    <>
      {/* 全局中文显示切换 */}
      <button
        className="fixed top-4 right-4 z-40 bg-black/50 hover:bg-black/70 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200"
        onClick={handleToggleTranslation}
      >
        {showTranslation ? '🙈 隐藏中文' : '👁 显示中文'}
      </button>

      <SceneView
        scene={currentScene}
        dialogueIndex={dialogueIndex}
        onAdvance={handleAdvance}
        onChoiceSelect={handleChoiceSelect}
        onResponseContinue={handleResponseContinue}
        onRestart={handleRestart}
        onWordClick={handleWordClick}
        onCompleteChapter={handleCompleteChapter}
        showTranslation={showTranslation}
        pendingResponse={pendingResponse}
      />
      <VocabPopup hint={activeHint} onClose={handlePopupClose} />
    </>
  )
}

export default App
