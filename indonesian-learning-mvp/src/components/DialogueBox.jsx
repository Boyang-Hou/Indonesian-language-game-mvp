import { useState, useEffect } from 'react'
import VocabHighlight from './VocabHighlight'

/**
 * DialogueBox - 单轮对话展示组件
 * 支持中文对照 blur 隐藏 + 点击单条揭示。
 */
export default function DialogueBox({ dialogue, onWordClick, showTranslation }) {
  const { character, indo, zh, vocab_hints } = dialogue
  const [revealed, setRevealed] = useState(false)

  // 全局切回"隐藏中文"时，重置单条揭示状态
  useEffect(() => {
    if (!showTranslation) setRevealed(false)
  }, [showTranslation])

  const zhVisible = showTranslation || revealed

  return (
    <div className="bg-black/70 rounded-xl px-5 py-4 mb-3 backdrop-blur-sm border border-white/10">
      {/* 角色名 */}
      <span className="inline-block text-yellow-400 text-xs font-semibold tracking-wide uppercase mb-2">
        {character}
      </span>

      {/* 印尼语文本（含高亮词） */}
      <p className="text-white text-base leading-relaxed mb-2">
        <VocabHighlight
          text={indo}
          hints={vocab_hints}
          onWordClick={onWordClick}
        />
      </p>

      {/* 中文对照：blur 隐藏 / 点击揭示 */}
      <p
        className={`text-gray-400 text-sm leading-relaxed transition-all duration-300 ${
          zhVisible ? '' : 'blur-sm cursor-pointer select-none'
        }`}
        onClick={() => { if (!zhVisible) setRevealed(true) }}
        title={zhVisible ? '' : '点击显示中文翻译'}
      >
        {zh}
      </p>
    </div>
  )
}
