import { Check } from 'lucide-react'

interface RegistrationProgressProps {
  currentStep: number
  totalSteps: number
  stepTitles: string[]
  onSelectStep?: (step: number) => void
}

export function RegistrationProgress({
  currentStep,
  totalSteps,
  stepTitles,
  onSelectStep,
}: RegistrationProgressProps) {
  const percentage = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)

  return (
    <div className="space-y-4 select-none">
      {/* Mobile: Progresso Compacto */}
      <div className="lg:hidden space-y-2 rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-orange-600 uppercase tracking-wider">
            Etapa {currentStep} de {totalSteps}
          </span>
          <span className="text-slate-500">{stepTitles[currentStep - 1]}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Desktop: Barra Horizontal de Passos */}
      <div className="hidden lg:block">
        <ol className="flex items-center justify-between gap-2 border-b border-slate-200 pb-4">
          {stepTitles.map((title, idx) => {
            const stepNum = idx + 1
            const isCompleted = stepNum < currentStep
            const isCurrent = stepNum === currentStep

            return (
              <li key={title} className="flex-1">
                <button
                  type="button"
                  onClick={() => isCompleted && onSelectStep && onSelectStep(stepNum)}
                  disabled={!isCompleted}
                  className={`flex w-full items-center gap-2 text-left transition-all ${
                    isCompleted ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-colors ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isCurrent
                          ? 'text-slate-900'
                          : isCompleted
                            ? 'text-slate-700 hover:text-orange-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {title}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
