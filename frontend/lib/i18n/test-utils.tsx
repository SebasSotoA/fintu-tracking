import type { ComponentType, ReactElement, ReactNode } from "react"
import { render, type RenderOptions, type RenderResult } from "@testing-library/react"
import { LocaleProvider } from "@/components/locale-provider"
import type { Locale } from "./types"

interface EnglishLocaleWrapperProps {
  children: ReactNode
}

export function EnglishLocaleWrapper({ children }: EnglishLocaleWrapperProps): ReactElement {
  return <LocaleProvider defaultLocale="en">{children}</LocaleProvider>
}

interface RenderWithLocaleOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale
  wrapper?: ComponentType<{ children: ReactNode }>
}

export function renderWithLocale(
  ui: ReactElement,
  options: RenderWithLocaleOptions = {},
): RenderResult {
  const { locale = "en", wrapper: InnerWrapper, ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    const inner = InnerWrapper ? <InnerWrapper>{children}</InnerWrapper> : children
    return <LocaleProvider defaultLocale={locale}>{inner}</LocaleProvider>
  }

  return render(ui, {
    ...renderOptions,
    wrapper: Wrapper,
  })
}
