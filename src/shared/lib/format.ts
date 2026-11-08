// Display format for the whole app: id-ID and Asia/Jakarta (ADR 0032, components.md).
const LOCALE = "id-ID"
const TIME_ZONE = "Asia/Jakarta"

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDateTime(value: Date): string {
  return dateTimeFormat.format(value)
}
