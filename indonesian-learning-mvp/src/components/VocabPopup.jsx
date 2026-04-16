/**
 * VocabPopup - 生词弹窗组件
 * hint 为 null 时不渲染；点击遮罩或关闭按钮触发 onClose。
 *
 * @param {{ hint: object|null, onClose: () => void }} props
 */
export default function VocabPopup({ hint, onClose }) {
  if (!hint) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-900 border border-yellow-400/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-white text-xl leading-none"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>

        {/* 词语标题 */}
        <h3 className="text-yellow-300 text-xl font-bold mb-4">{hint.word}</h3>

        {/* 词义 */}
        <div className="mb-3">
          <span className="text-gray-400 text-sm">词义</span>
          <p className="text-white mt-1">{hint.meaning}</p>
        </div>

        {/* 词根拆解 */}
        <div className="mb-3">
          <span className="text-gray-400 text-sm">词根</span>
          <p className="text-white mt-1">{hint.root}</p>
        </div>

        {/* 文化钩子 */}
        <div>
          <span className="text-gray-400 text-sm">文化背景</span>
          <p className="text-yellow-100/80 mt-1 text-sm leading-relaxed">{hint.culture_hook}</p>
        </div>
      </div>
    </div>
  )
}
