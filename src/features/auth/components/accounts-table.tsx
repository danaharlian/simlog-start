import { formatDateTime } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import {
  ACCOUNT_STATUS_LABEL,
  ROLE_LABEL,
} from "@/features/auth/components/account-labels"
import type { AccountRow, AccountStatus } from "@/features/auth/schemas"

const STATUS_BADGE: Record<
  AccountStatus,
  "secondary" | "default" | "destructive" | "outline"
> = {
  pending: "secondary",
  active: "default",
  rejected: "destructive",
  inactive: "outline",
}

type AccountsTableProps = { readonly rows: ReadonlyArray<AccountRow> }

// Shows only the R16 columns (NFR6); the DTO carries nothing else.
export function AccountsTable({ rows }: AccountsTableProps) {
  return (
    <Table>
      <TableCaption className="sr-only">Daftar akun</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Waktu daftar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>@{row.username}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[row.status]}>
                {ACCOUNT_STATUS_LABEL[row.status]}
              </Badge>
            </TableCell>
            <TableCell>{ROLE_LABEL[row.role]}</TableCell>
            <TableCell>{formatDateTime(new Date(row.createdAt))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
