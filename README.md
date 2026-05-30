# Mukesh Sethy - Portfolio Website

Static portfolio website for GitHub Pages built with HTML, CSS, and vanilla JavaScript (no build tools, no external JS libraries).

## Pages (Folder-Style URLs)

- `/` -> `index.html` (Home)
- `/experience/` -> `experience/index.html`
- `/projects/` -> `projects/index.html`
- `/about/` -> `about/index.html`
- `/contact/` -> `contact/index.html`

## Local Open (file://) Compatibility

GitHub Pages serves folder routes like `/projects/` by automatically loading `projects/index.html`.

When opening locally via `file://`, browsers do not auto-open a folder `index.html`. To keep clean folder links in HTML, `script.js` rewrites internal links ending with `/` to `.../index.html` when `location.protocol === "file:"`.

## Self-Hosted Fonts (Offline-Friendly)

Fonts are bundled under `assets/fonts/` and loaded via `fonts.css`:

- Inter (variable) -> `assets/fonts/InterVariable.woff2`
- JetBrains Mono -> `assets/fonts/JetBrainsMono-*.woff2`

Licenses:

- `assets/fonts/LICENSE-Inter.txt`
- `assets/fonts/LICENSE-JetBrainsMono.txt`

## Project Images (Reserved Slots)

Project cards include a reserved media block:

- `projects/index.html`: each `.project-card` contains a `.project-media` element

To add images later, place files under something like `assets/projects/` and insert an image inside a card:

```html
<div class="project-media" aria-hidden="true">
  <img src="../assets/projects/my-project.jpg" alt="" loading="lazy" decoding="async" />
</div>
```

## File Structure

```
.
|-- index.html
|-- experience/
|   `-- index.html
|-- projects/
|   `-- index.html
|-- about/
|   `-- index.html
|-- contact/
|   `-- index.html
|-- style.css
|-- fonts.css
|-- script.js
|-- assets/
|   |-- profile.jpg
|   `-- fonts/
|       |-- InterVariable.woff2
|       |-- JetBrainsMono-*.woff2
|       |-- LICENSE-Inter.txt
|       `-- LICENSE-JetBrainsMono.txt
|-- resume.pdf
|-- .gitignore
`-- README.md
```

## Preview Locally

- Open `index.html` in your browser.

## Publish with GitHub Pages

1. GitHub -> Repository Settings
2. Pages
3. Build and deployment:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`

