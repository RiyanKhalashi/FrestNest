# FreshNest project report

The report is written in Markdown and built into a Word file that follows the DIU demo report.

- `chapters/*.md`: the text, one file per chapter (`00-front.md` holds the acknowledgements and abstract).
- `report.json`: title, names, ID and supervisor used on the cover and the declaration pages. Their wording is in `front.mjs`.
- `diagrams/` and `screenshots/`: PNG files. A figure line such as `![Figure 1.1: FreshNest block diagram](diagrams/block-diagram.png)` shows the picture once the file exists, and a dashed placeholder box until then.
- `FreshNest-Project-Report.docx`: the built report. Do not edit it by hand until the final polish, because every build replaces it.

Build:

```sh
export PATH="$HOME/.local/node/bin:$PATH"
cd docs/report
npm install   # first time only
npm run build
```

This Mac has no Word, and VS Code can't show Word files. `npm run preview` makes `FreshNest-Report-Preview.pdf` with Google Chrome: the cover, the declarations, acknowledgements, abstract, table of contents, list of figures and list of tables, and Chapter 1 to the references, in the same fonts and layout. The contents get their page numbers from the printed chapters (found with pdfjs-dist), so the PDF is complete without Word. Page breaks can differ slightly from Word's.

Diagrams are draw.io files in `diagrams/`; open one in VS Code (draw.io extension) to edit it. Then:

```sh
npm run diagrams        # turns every diagrams/*.drawio into a PNG (draw.io's own renderer, offline)
npm run build && npm run preview
```

`make-diagrams.mjs` first wrote the diagrams from code (the ER diagram straight from `backend/prisma/schema.prisma`). It never replaces an existing `.drawio` unless you add `--force`, which would undo hand edits, for example `node make-diagrams.mjs --force er-diagram` after the schema changes.

Chapter 5's screenshots come from the live website with the demo accounts:

```sh
npm run screenshots                 # all of them, into screenshots/
npm run screenshots farmer-home     # only the named ones (see the list in screenshots.mjs)
npm run build && npm run preview
```

The script only opens pages; it never submits a form or changes data. Screenshots are JPEG (1280 px wide, quality 85), so the Word file stays under 8 MB; the build accepts both PNG and JPEG figures.

Text in `[[double brackets]]` shows as a yellow placeholder. When Word asks to update fields on opening, choose **Yes** so the table of contents and list of figures get exact page numbers.
