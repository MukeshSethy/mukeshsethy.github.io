# Mukesh Sethy - Portfolio Website

Static personal portfolio website for GitHub Pages built with HTML, CSS, and vanilla JavaScript (no external dependencies).

## What's included

- Dark theme by default + light/dark toggle (saved to localStorage)
- Sticky navbar with mobile hamburger menu
- Smooth scrolling + mobile menu auto-close on navigation
- Filterable project cards
- Responsive layout (mobile / tablet / desktop)
- Works by opening `index.html` locally (no build step)

## File structure

```
.
|-- index.html
|-- style.css
|-- script.js
|-- resume.pdf
|-- .gitignore
`-- README.md
```

## Preview locally

- Open `index.html` in your browser.

## Customize

- Content:
  - Edit sections in `index.html` (About, Experience, Projects, Skills, Education, Contact).
- Resume:
  - Replace `resume.pdf` with your latest version (keep the filename as `resume.pdf`).
- Contact:
  - Update email/phone/location in `index.html`.
  - If you prefer not to publish your phone number publicly, remove the Phone card.
- Projects:
  - Edit the `<article class="project-card" ...>` blocks in `index.html`.
  - Categories are controlled by `data-category` on each card and the filter buttons' `data-filter`.

## Publish with GitHub Pages

1. Go to the repository on GitHub
2. Open `Settings`
3. Click `Pages`
4. Under `Build and deployment`:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Click `Save`

## Live URL

- https://mukeshsethy.github.io/
- After pushing changes to `main`, GitHub Pages may take a minute or two to redeploy.

## Notes

- No analytics, trackers, or external libraries are used.

