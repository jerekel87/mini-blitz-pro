import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function SelectInput({ className, children, ...props }: SelectInputProps) {
  return (
    <div className="input-select-wrap">
      <select className={clsx('input-field input-field-select text-sm', className)} {...props}>
        {children}
      </select>
      <span className="input-select-chevron" aria-hidden>
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </div>
  );
}