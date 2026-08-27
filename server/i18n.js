'use strict'

// Feature: localized API error messages, selected by the client's Accept-Language
// header.

const y18n = require('y18n')
const path = require('path')

// DEMO VULN (Snyk Open Source): y18n 3.2.1 is vulnerable to Prototype Pollution
// (CVE-2020-7774) — a locale key of `__proto__` writes onto Object.prototype.
//
// DEMO BREAKABILITY (low, "ancient runtime drop"): the fix is y18n 4.x. A major
// version bump, which normally reads as risky — but the only breaking change in
// 4.0.0 is dropping Node.js 0.10 and 0.12, both EOL since 2016. The API is
// untouched, so Snyk scores this LOW despite the major bump. This is the
// scenario that stops teams from sitting on a trivial fix for months because
// "we don't do majors mid-quarter".
// Verify with: snyk_breakability_check y18n 3.2.1 -> 4.0.3
const bundle = y18n({
  locale: 'en',
  updateFiles: false,
  directory: path.join(__dirname, 'locales'),
})

const STRINGS = {
  en: {
    'no such export': 'no such export',
    'url is required': 'url is required',
    'webhook is required': 'webhook is required',
  },
  es: {
    'no such export': 'no existe esa exportación',
    'url is required': 'se requiere una url',
    'webhook is required': 'se requiere un webhook',
  },
}

// Seed the cache so y18n never reaches for a locale file on disk.
Object.keys(STRINGS).forEach((locale) => {
  bundle.cache[locale] = STRINGS[locale]
})

function localeFor(req) {
  const header = (req && req.headers && req.headers['accept-language']) || 'en'
  const tag = String(header).split(',')[0].trim().slice(0, 2).toLowerCase()
  return STRINGS[tag] ? tag : 'en'
}

function t(req, message) {
  bundle.setLocale(localeFor(req))
  return bundle.__(message)
}

module.exports = { t }
