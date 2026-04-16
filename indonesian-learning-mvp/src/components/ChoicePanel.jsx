/**
 * ChoicePanel - 场景结束后的选项面板
 * 支持 story 和 challenge 两种类型的选项。
 */
export default function ChoicePanel({ choices, onChoiceSelect }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {choices.map((choice, i) => {
        const isChallenge = choice.type === 'challenge'
        return (
          <button
            key={i}
            className={`w-full border text-white text-left rounded-xl px-5 py-3 transition-all duration-200 text-sm leading-relaxed ${
              isChallenge
                ? 'bg-white/5 hover:bg-white/15 border-yellow-400/30 hover:border-yellow-400/70'
                : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-yellow-400/60'
            }`}
            onClick={() =>
              onChoiceSelect(
                choice.next,
                choice.response ?? null,
                isChallenge ? (choice.correct ?? null) : null
              )
            }
          >
            {isChallenge && (
              <span className="block text-yellow-400/70 text-xs mb-1">💬 用印尼语表达</span>
            )}
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
