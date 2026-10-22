# Peng-Hu Du — Academic Website

Public website: <https://peng-hudu.github.io/>  
Browser editor: <https://peng-hudu.github.io/admin/>

This repository is the **public deployment target**. The authoritative profile data and website/editor source are maintained in the private repository [`Peng-HuDu/academic-profile`](https://github.com/Peng-HuDu/academic-profile). GitHub Actions builds that source and publishes generated files here.

## What is in this repository

- `index.html`, `research.html`, `publications.html`, `events.html`, `contact.html`: the five public academic website pages.
- `admin/index.html`: the browser-based Chinese editing interface.
- `src/`: generated static JavaScript and CSS assets required by the editor. These are deployment copies of the private repository's source; the private repository remains the place to change them.
- `config/site.json`: public, non-secret editor routing settings for the private repository and website.
- `.site-generated` and `.nojekyll`: deployment markers/settings.
- `README.md`: documentation for this public deployment repository; the publishing workflow preserves this file.

## What must not be stored here

The complete profile JSON, private notes, API credentials, GitHub tokens, CV exports, and BibTeX files belong outside this public repository. The private publishing workflow sends only the rendered public pages and the static editor assets needed to run the interface.

The editor's code is public. After you connect from the editor, the browser uses your fine-grained GitHub token to read or update the profile in the private repository. The token is kept only in the open browser tab. It is never part of this repository or the generated files.

## Editing and publishing

1. Open <https://peng-hudu.github.io/admin/>.
2. Connect GitHub using a fine-grained token scoped only to `Peng-HuDu/academic-profile`, with `Contents: Read and write`.
3. Edit the profile, preview each page, and save to the private repository.
4. The private repository's Actions workflow rebuilds the public pages and deploys them here.

Do not directly edit generated HTML or `src/` copies in this repository. The next automated deployment replaces generated files from the private source. To change the design or editor behavior, edit the corresponding source in `Peng-HuDu/academic-profile`.

Anyone can view this public repository; write access is limited to the repository owner and authorized collaborators.
