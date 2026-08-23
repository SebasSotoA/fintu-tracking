import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { JSDOM } from 'jsdom'
import { within } from '@testing-library/dom'

let containerPromise: Promise<AstroContainer> | null = null

async function getContainer(): Promise<AstroContainer> {
  if (!containerPromise) {
    containerPromise = AstroContainer.create()
  }
  return containerPromise
}

export interface Rendered {
  /** The body element containing the rendered HTML. */
  container: HTMLElement
  /** The root document element. */
  baseElement: HTMLElement
  /** The parsed document. */
  document: Document
  /** The JSDOM window (useful for globals when running in node env). */
  window: typeof JSDOM.prototype.window
  /** The raw HTML string returned by the Astro container. */
  html: string
  /** @testing-library/dom queries scoped to the rendered body. */
  within: ReturnType<typeof within>
  /** @testing-library/dom `getByText` scoped to the rendered body. */
  getByText: ReturnType<typeof within>['getByText']
  /** @testing-library/dom `queryByText` scoped to the rendered body. */
  queryByText: ReturnType<typeof within>['queryByText']
  /** @testing-library/dom `getByRole` scoped to the rendered body. */
  getByRole: ReturnType<typeof within>['getByRole']
  /** @testing-library/dom `queryByRole` scoped to the rendered body. */
  queryByRole: ReturnType<typeof within>['queryByRole']
  /** @testing-library/dom `getAllByText` scoped to the rendered body. */
  getAllByText: ReturnType<typeof within>['getAllByText']
  /** @testing-library/dom `queryAllByText` scoped to the rendered body. */
  queryAllByText: ReturnType<typeof within>['queryAllByText']
}

/**
 * Render an Astro component to HTML via Astro's container API, parse the
 * result into a fresh JSDOM, and return @testing-library/dom helpers scoped
 * to the rendered `<body>`. Because tests run in the Node environment (so the
 * Astro vite plugin transforms `.astro` files server-side), there is no global
 * `document` — callers should use the returned `within`/`getByText` helpers
 * rather than `@testing-library/dom`'s module-level `screen`.
 *
 * `slots` are forwarded to `container.renderToString`. Pass an HTML string
 * for the default slot (e.g. `{ default: '<p>hi</p>' }`).
 */
export async function renderAstro(
  Component: unknown,
  options: { slots?: Record<string, string>; props?: Record<string, unknown> } = {},
): Promise<Rendered> {
  const container = await getContainer()
  const html = await container.renderToString(Component as never, {
    slots: options.slots,
    props: options.props as never,
  })
  const dom = new JSDOM(html)
  const document = dom.window.document
  const scoped = within(document.body)
  return {
    container: document.body,
    baseElement: document.documentElement,
    document,
    window: dom.window,
    html,
    within: scoped,
    getByText: scoped.getByText,
    queryByText: scoped.queryByText,
    getByRole: scoped.getByRole,
    queryByRole: scoped.queryByRole,
    getAllByText: scoped.getAllByText,
    queryAllByText: scoped.queryAllByText,
  }
}