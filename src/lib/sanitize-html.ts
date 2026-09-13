/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Allow-list sanitiser for HTML that came from the server.
 *
 * Angular's `[innerHTML]` sanitises what it renders; React's
 * `dangerouslySetInnerHTML` does not. Anything stored by one user and rendered
 * in another user's browser — a document template body, for instance — has to
 * pass through here first, or a saved `<script>` becomes stored XSS.
 *
 * The policy is an allow-list: unknown elements are unwrapped so their text
 * survives, dangerous ones are dropped whole, and every attribute that is not
 * explicitly permitted goes away (which covers every `on*` handler).
 */

/** Elements removed together with their content. */
const FORBIDDEN_TAGS = new Set([
  'APPLET',
  'BASE',
  'EMBED',
  'FORM',
  'FRAME',
  'FRAMESET',
  'IFRAME',
  'INPUT',
  'LINK',
  'MATH',
  'META',
  'NOSCRIPT',
  'OBJECT',
  'PARAM',
  'SCRIPT',
  'SELECT',
  'STYLE',
  'SVG',
  'TEMPLATE',
  'TEXTAREA',
])

/** Elements kept as-is. Anything else is unwrapped down to its children. */
const ALLOWED_TAGS = new Set([
  'A',
  'ABBR',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CAPTION',
  'CODE',
  'COL',
  'COLGROUP',
  'DD',
  'DIV',
  'DL',
  'DT',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'I',
  'IMG',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SMALL',
  'SPAN',
  'STRONG',
  'SUB',
  'SUP',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
])

const GLOBAL_ATTRIBUTES = new Set(['align', 'class', 'dir', 'lang', 'title'])

const TAG_ATTRIBUTES: Record<string, string[]> = {
  A: ['href', 'name', 'target'],
  COL: ['span', 'width'],
  COLGROUP: ['span', 'width'],
  IMG: ['alt', 'height', 'src', 'width'],
  OL: ['reversed', 'start', 'type'],
  TABLE: ['border', 'cellpadding', 'cellspacing', 'summary', 'width'],
  TD: ['colspan', 'headers', 'rowspan', 'valign'],
  TH: ['abbr', 'colspan', 'headers', 'rowspan', 'scope', 'valign'],
}

/** Attributes holding a URL, whose scheme needs checking. */
const URL_ATTRIBUTES = new Set(['href', 'src'])

const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/** Data URLs are allowed for raster images only — never SVG, which scripts. */
const SAFE_DATA_URL =
  /^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,[a-z0-9+/=\s]*$/i

const isSafeUrl = (value: string): boolean => {
  // A NUL or newline inside the scheme (`java\0script:`) slips past a naive
  // scheme check while the browser still resolves the URL as javascript:.
  const url = Array.from(value)
    .filter(character => {
      const code = character.charCodeAt(0)
      return code > 0x20 && code !== 0x7f
    })
    .join('')
  if (url === '') return true

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  if (!scheme) return true // relative URL, or a Mustache placeholder
  if (scheme[1].toLowerCase() === 'data') return SAFE_DATA_URL.test(url)
  return SAFE_URL_SCHEMES.has(`${scheme[1].toLowerCase()}:`)
}

/** Drops declarations that can fetch or execute, keeping presentational ones. */
const sanitizeStyle = (style: string): string =>
  style
    .split(';')
    .filter(declaration => {
      const value = declaration.toLowerCase()
      return (
        declaration.trim() !== '' &&
        !value.includes('url(') &&
        !value.includes('expression') &&
        !value.includes('javascript:') &&
        !value.includes('@import') &&
        !value.includes('behavior')
      )
    })
    .join(';')

const isAttributeAllowed = (tag: string, name: string): boolean =>
  GLOBAL_ATTRIBUTES.has(name) ||
  name === 'style' ||
  (TAG_ATTRIBUTES[tag] ?? []).includes(name)

const unwrap = (element: Element): void => {
  const parent = element.parentNode
  if (!parent) return
  while (element.firstChild) parent.insertBefore(element.firstChild, element)
  parent.removeChild(element)
}

const clean = (element: Element): void => {
  // Snapshot the children: the collection is live and the loop reparents nodes.
  for (const child of Array.from(element.children)) {
    const tag = child.tagName.toUpperCase()

    if (FORBIDDEN_TAGS.has(tag)) {
      child.remove()
      continue
    }

    clean(child)

    if (!ALLOWED_TAGS.has(tag)) {
      unwrap(child)
      continue
    }

    for (const attribute of Array.from(child.attributes)) {
      const name = attribute.name.toLowerCase()

      if (!isAttributeAllowed(tag, name)) {
        child.removeAttribute(attribute.name)
        continue
      }
      if (URL_ATTRIBUTES.has(name) && !isSafeUrl(attribute.value)) {
        child.removeAttribute(attribute.name)
        continue
      }
      if (name === 'style') {
        const style = sanitizeStyle(attribute.value)
        if (style === '') child.removeAttribute(attribute.name)
        else child.setAttribute(attribute.name, style)
      }
    }

    // A link that opens a new tab must not hand its opener to the target.
    if (tag === 'A' && child.getAttribute('target')) {
      child.setAttribute('rel', 'noopener noreferrer')
    }
  }
}

/** Returns `html` with everything outside the allow-list removed. */
export const sanitizeHtml = (html: string): string => {
  if (!html) return ''
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  clean(parsed.body)
  return parsed.body.innerHTML
}
