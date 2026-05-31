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

Automated deployment (what I added):

- This repo now contains a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` which will deploy the repository root to GitHub Pages whenever you push to `main`.
- I cannot push to your remote for you — to publish the site live, push these changes to a GitHub repository you control.

Quick push instructions (run these in PowerShell from `d:\VSCode_Scripts\Cpp`):

```powershell
git init             # only if you haven't initialized a repo locally
git add .
git commit -m "Add contributions calendar and Pages deploy workflow"
git branch -M main   # create/rename main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

After the push completes, open the repository on GitHub. The Actions tab will show the Pages deploy workflow; once it finishes, your site will be published at `https://<your-username>.github.io/<your-repo>/` (or the repo root if using a user/org site). If you want me to customize the workflow (e.g., deploy only the `Cpp` folder or to a `gh-pages` branch), tell me which repo path you prefer.

Since this repository is a user/organization Pages site (`mukeshsethy.github.io`), once the workflow finishes your site will be available at:

```
https://mukeshsethy.github.io/
```

Notes:
- The workflow is configured to upload the `Cpp` folder contents and publish them as the Pages site root. If you want a different folder or branch, I can update the workflow.

