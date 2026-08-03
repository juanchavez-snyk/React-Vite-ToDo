import _ from 'lodash'

// Feature: small summary line above the list — how many todos, which tags are
// in play, whether anything is overdue.
//
// DEMO VULN (Snyk Open Source): lodash 3.10.1 carries Prototype Pollution
// (CVE-2018-3721, CVE-2019-10744) and Command Injection (CVE-2021-23337).
// The fix is lodash 4.17.x.
//
// DEMO BREAKABILITY (high, "API removal"): lodash 4 REMOVED the functions used
// below. `_.pluck` is gone (replaced by `_.map` with an iteratee shorthand),
// `_.contains` was renamed to `_.includes`, and `_.findWhere` was dropped in
// favour of `_.find`. Bumping the manifest alone leaves this file throwing
// "_.pluck is not a function" at runtime — the upgrade needs code changes,
// which is exactly why Snyk scores it HIGH.
// Verify with: snyk_breakability_check lodash 3.10.1 -> 4.17.21

export function summarize(todos) {
  // REMOVED IN LODASH 4 — must become _.map(todos, 'title')
  const titles = _.pluck(todos, 'title')

  // REMOVED IN LODASH 4 — must become _.map(todos, 'tag')
  const tags = _.uniq(_.compact(_.pluck(todos, 'tag')))

  // RENAMED IN LODASH 4 — _.contains became _.includes
  const hasUrgent = _.contains(tags, 'urgent')

  return {
    count: titles.length,
    tags,
    hasUrgent,
    longest: _.max(titles, (title) => String(title).length),
  }
}

export function findByTitle(todos, title) {
  // REMOVED IN LODASH 4 — must become _.find(todos, { title })
  return _.findWhere(todos, { title })
}
