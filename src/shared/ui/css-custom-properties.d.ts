// shared/ui/css-custom-properties.d.ts: lets `style` accept CSS variables with no cast
import "react"

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
