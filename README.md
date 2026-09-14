# NextHub Dashboard (demo)

Demo page for the innovation & agility dashboard. Static — no build step.

```
index.html          page markup (design-component template) + editable props
css/dashboard.css   page-level styles
js/data.js          demo data (departments, problems, ideas, initiatives, …)
js/dashboard.js     component logic (state, view models for the template)
support.js          dc-runtime (generated, do not edit) — renders the template
uploads/            reference material used while designing; not loaded by the page
```

## Run

Serve the folder over HTTP (the runtime re-fetches the page, which `file://` blocks):

```bash
python -m http.server 8765
```

then open <http://localhost:8765/index.html>. React is loaded from a CDN, so an
internet connection is required.

## How the pieces fit

`support.js` looks for `<x-dc>` in the page and renders its contents as a
template (`{{ … }}` bindings, `<sc-if>`, `<sc-for>`). The logic class is
picked up from `<script data-dc-script>` and evaluated with `DCLogic` in scope,
so `index.html` only contains the one-liner
`const Component = window.createDashboardComponent(DCLogic);` — the class
itself lives in `js/dashboard.js`, and the data it renders in `js/data.js`.
