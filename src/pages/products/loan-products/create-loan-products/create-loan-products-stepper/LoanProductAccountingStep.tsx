/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PostLoanProductsRequest } from '@/fineract-api'

const ACCOUNTING_RULES = [
  { value: '1', label: 'None' },
  { value: '2', label: 'Cash' },
  { value: '3', label: 'Accrual (Periodic)' },
  { value: '4', label: 'Accrual (Upfront)' },
]

interface LoanProductAccountingStepProps {
  formData: PostLoanProductsRequest
  onChange: (data: PostLoanProductsRequest) => void
}

const LoanProductAccountingStep = ({
  formData,
  onChange,
}: LoanProductAccountingStepProps) => {
  return (
    <div className="flex flex-col gap-6">
      <RadioGroup
        value={formData.accountingRule?.toString() ?? '1'}
        onValueChange={value =>
          onChange({ ...formData, accountingRule: Number(value) })
        }
        className="flex flex-col md:flex-row gap-6"
      >
        {ACCOUNTING_RULES.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem value={value} id={`rule-${value}`} />
            <Label
              htmlFor={`rule-${value}`}
              className="cursor-pointer font-normal"
            >
              {label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {formData.accountingRule && formData.accountingRule > 1 && (
        <div className="w-full rounded-md border border-input px-3 py-2 text-sm text-muted-foreground bg-muted/40">
          Accounting fields — not yet implemented
        </div>
      )}
    </div>
  )
}
export default LoanProductAccountingStep
