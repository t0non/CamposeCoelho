import { Switch } from '@/components/ui/switch'

interface FormSwitchProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function FormSwitch({ label, description, checked, onCheckedChange }: FormSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} onChange={onCheckedChange} />
    </div>
  )
}
