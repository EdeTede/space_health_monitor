# Security notes

## Automated scan findings

GitHub's scanner reports 18 findings of the form *"user controlled data in
methods like `innerHTML` is an anti-pattern that can lead to XSS
vulnerabilities."*

These are false positives, and the code has nonetheless been changed so the
scanner's data-flow trace is broken at the source.

## Why they were false positives

The application has no channel through which attacker-controlled data can arrive.

- No network requests. No `fetch`, no `XMLHttpRequest`, no external resources
  beyond a Google Fonts stylesheet.
- No server, no backend, no database.
- No URL parameter, hash or query string is read.
- No `localStorage`, `sessionStorage`, cookies or `postMessage`.
- No file upload, no clipboard read, no `eval`.

The only inputs are the page's own range and number controls, operated by the
person sitting in front of the page. There is no second party.

Every one of those values passed through `parseFloat()` before entering state.
A string such as `<script>alert(1)</script>` becomes `NaN`, which became `0`.
A formatted number cannot carry markup.

## What was changed anyway

An unresolved security finding is worse than the five minutes it takes to remove
it, and the change fixes a real robustness gap as well.

**A single input boundary.** Every control's value now enters state through one
function.

```js
function num(el, fallback){
  var v = Number(el.value);
  if(typeof v !== "number" || !isFinite(v)) return fallback;
  var lo = el.min===""?-Infinity:Number(el.min);
  var hi = el.max===""? Infinity:Number(el.max);
  if(isFinite(lo) && v<lo) v=lo;
  if(isFinite(hi) && v>hi) v=hi;
  return v;
}
```

It coerces, rejects anything non-finite, and clamps to the control's own declared
`min` and `max`. `parseFloat` no longer appears anywhere in the codebase. This
also fixes the previous behaviour where a `NaN` could propagate into the model
and produce `NaN` output.

**Two output formatters.** Every number printed into markup goes through `fx()`
for a fixed-decimal value or `iv()` for an integer. Both re-coerce and both
return `"0"` for anything non-finite, so what reaches `innerHTML` is always a
numeric literal.

**Enumerated values are checked against their maps.** The `data-` attributes on
the segmented controls are validated against the objects they index rather than
assigned directly, so an injected attribute value is rejected rather than stored.

## Verification

Hostile strings fed through the boundary:

| Input | After `num()` | After `fx(,2)` |
| --- | --- | --- |
| `<script>alert(1)</script>` | 7 | `7.00` |
| `"><img src=x onerror=alert(1)>` | 7 | `7.00` |
| `javascript:alert(1)` | 7 | `7.00` |
| `<b>5</b>` | 7 | `7.00` |
| `1e999` | 7 | `7.00` |
| `NaN` | 7 | `7.00` |
| `Infinity` | 7 | `7.00` |

Where 7 is the fallback. No markup survives.

## Remaining `innerHTML` use

`innerHTML` is still used to write markup the application itself authors, and
SVG it generates. The interpolated values are numeric literals produced by the
formatters above. A scanner that flags `innerHTML` unconditionally will continue
to flag these; the data-flow from input to sink no longer exists.
