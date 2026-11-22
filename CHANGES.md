# Changes

## 2.0.0 2026-11-22

First entry of this change log. Earlier versions are on npm and in the git
history.

* Seneca 4: the peer dependency is `seneca` `^4.0.0` (was `>=3`). Seneca 3
  users stay on `@seneca/flame@1`.
* Node.js 24 or later (`engines.node` `>=24`).
* The dependency and peer dependency `seneca-promisify` are removed. Seneca 4
  has promises built in, and the plugin never used it (D4).
* Capture stops when the instance closes. The close action is registered
  with `this.destroy`, so the close actions of other plugins run as well
  (D4). 1.0.1 used `role:seneca,cmd:close` and did not call them.
* A message that runs no action, such as one that matches no pattern, no
  longer makes the outward step throw a `TypeError`; it is not recorded.
* `sys:flame,cmd:toggle_frame` replies `{ success: true }`; 1.0.1 did not
  reply, so the caller timed out. `sys:flame,cmd:snapshot` without a valid
  `format` replies once; 1.0.1 replied twice.
* `sys:flame,cmd:snapshot,format:html` works from the published package:
  the build copies the HTML template to `dist/Snapshot/html`, which 1.0.1
  did not ship.
* `sys:flame,capture:<bool>`, which `@seneca/debug` sends, is unchanged.
* The build uses TypeScript 5.9 and `@types/node` 24; it failed with
  TypeScript 4.7 on Node.js 24.
* `repository`, `homepage`, `description` and `keywords` describe this
  package; they were copied from `@seneca/gateway`.
