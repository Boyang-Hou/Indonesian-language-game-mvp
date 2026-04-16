/**
 * EndingCard - 第一章结尾专属组件
 * 展示悬念钩子，CTA 按钮点击后重置到场景 1。
 *
 * @param {{ ending: {title: string, text: string, cta_text: string}, onRestart: () => void }} props
 */
export default function EndingCard({ ending, onRestart }) {
  return (
    <div className="mt-6 bg-gradient-to-b from-purple-900/60 to-black/80 border border-purple-400/30 rounded-2xl px-6 py-8 text-center">
      {/* 标题 */}
      <h2 className="text-yellow-300 text-2xl font-bold mb-4">{ending.title}</h2>

      {/* 正文 */}
      <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line mb-6">
        {ending.text}
      </p>

      {/* CTA 按钮 */}
      <button
        className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold rounded-xl px-8 py-3 transition-colors duration-200"
        onClick={onRestart}
      >
        {ending.cta_text}
      </button>
    </div>
  )
}
