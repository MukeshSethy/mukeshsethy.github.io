# Mukesh Sethy - Portfolio Website

Static personal portfolio website built for GitHub Pages using only HTML, CSS, and vanilla JavaScript (no external dependencies).

## What's included

- Dark theme by default + light/dark toggle (saved to localStorage)
- Sticky navbar with mobile hamburger menu
- Smooth scrolling + mobile menu auto-close on navigation
- Filterable project cards
- Responsive layout (mobile / tablet / desktop)

## File structure

```
.
|-- index.html
|-- style.css
|-- script.js
|-- .gitignore
`-- README.md
```

## Preview locally

Option 1 (simplest):
- Open index.html in your browser.

Option 2:
- Use any static file server (optional). The site does not require one.

## Customize

- Name + title + summary:
  - Edit the Hero section in index.html.
- Resume:
  - Upload your real resume as resume.pdf in the repository root.
  - The buttons in index.html already point to resume.pdf (placeholder link).
- GitHub link:
  - Update the GitHub URL in the Contact section in index.html.
- LinkedIn link:
  - Update https://linkedin.com/in/your-linkedin-id in the Contact section in index.html before publishing.
- Project cards:
  - Edit the project <article class="project-card" ...> blocks in index.html.
  - Categories are controlled by data-category on each card and filter buttons in the Projects section.

## Publish with GitHub Pages

1. Go to your repository on GitHub
2. Open Settings
3. Click Pages
4. Under Build and deployment:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
5. Click Save

## Expected live URL (depends on repository name)

GitHub Pages user sites must use the repository name <username>.github.io.

- If the repo is mukeshsethy.github.io:
  - https://mukeshsethy.github.io
- If the repo remains mukesh.github.io under the mukeshsethy account, it will publish as a project site:
  - https://mukeshsethy.github.io/mukesh.github.io/

## Notes

- resume.pdf is not included in this repo by design. Add it manually before publishing.
- No analytics, trackers, or external libraries are used.
