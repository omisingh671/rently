type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

export default function ActiveToggle({
  checked,
  disabled = false,
  onChange,
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition
        ${checked ? "bg-green-500" : "bg-slate-300"}
        disabled:opacity-50`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition
          ${checked ? "translate-x-4" : "translate-x-1"}`}
      />
    </button>
  );
}
