'use client';

import { useId, type ReactNode } from 'react';

const shell =
  'flex h-10 items-center gap-1.5 border border-line bg-[#fffdf8] px-3 text-sm transition-colors focus-within:border-green';

function digitsOnly(value: string) {
  return value
    .replace(/[^\d]/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 12);
}

function decimal(value: string, places = 2) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (!rest.length) return whole ?? '';
  return `${whole}.${rest.join('').slice(0, places)}`;
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  className,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  multiline?: boolean;
  className?: string;
  suggestions?: string[];
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) =>
        multiline ? (
          <textarea
            id={id}
            rows={2}
            className="min-h-16 border border-line bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-green"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <>
            <input
              id={id}
              list={suggestions?.length ? `${id}-list` : undefined}
              className="h-10 border border-line bg-[#fffdf8] px-3 text-sm outline-none focus:border-green"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onChange(event.target.value)}
            />
            {suggestions?.length ? (
              <datalist id={`${id}-list`}>
                {suggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            ) : null}
          </>
        )
      }
    </Field>
  );
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          className="h-10 w-full min-w-0 border border-line bg-[#fffdf8] px-2.5 text-sm outline-none focus:border-green"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose one</option>
          {options.map((option) => {
            const o = typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            );
          })}
        </select>
      )}
    </Field>
  );
}

export function BareMoney({
  value,
  onChange,
  id,
  ariaLabel,
  large,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  large?: boolean;
}) {
  return (
    <span className={large ? `${shell} h-14 border-green font-serif text-2xl text-green` : shell}>
      <span className="text-muted">$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
        value={value ? Number(value).toLocaleString('en-US') : ''}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
      />
    </span>
  );
}

export function MoneyInput({
  label,
  value,
  onChange,
  hint,
  large,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  large?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => <BareMoney id={id} value={value} onChange={onChange} large={large} />}
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  suffix,
  hint,
  places = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  hint?: ReactNode;
  places?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <span className={shell}>
          <input
            id={id}
            inputMode="decimal"
            className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
            value={value}
            onChange={(event) => onChange(decimal(event.target.value, places))}
          />
          <span className="text-muted">{suffix}</span>
        </span>
      )}
    </Field>
  );
}

export function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | '';
  onChange: (value: T | '') => void;
  options: Array<{ value: T; label: string }>;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer border px-3.5 py-1.5 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-green ${
                on
                  ? 'border-green bg-green font-semibold text-card'
                  : 'border-line bg-[#fffdf8] text-ink hover:border-green'
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={on}
                onChange={() => onChange(option.value)}
                onClick={() => (on ? onChange('') : undefined)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
