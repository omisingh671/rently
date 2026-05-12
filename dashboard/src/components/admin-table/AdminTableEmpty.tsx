type Props = {
  colSpan: number;
  message: string;
};

export default function AdminTableEmpty({ colSpan, message }: Props) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-6 text-center text-sm text-slate-500"
      >
        {message}
      </td>
    </tr>
  );
}
