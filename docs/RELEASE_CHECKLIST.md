# GymFlow Landing Page + Downloads Release Checklist

Use this to keep the landing page and downloads in sync for every release.

## 1) Build installers
- `npm run build:win`
- `npm run build:mac`

## 2) Create GitHub Release + Upload Assets
- Tag as `v<version>` (example: `v1.0.0`)
- Upload these assets to the release:
  - `dist/GymFlow-arm64.dmg`
  - `dist/gymflow-<version>-setup.exe`

## 3) Update landing page version label
- Edit `docs/index.html`
- Update `data-version` to match the release tag (example: `1.0.0`)

## 4) Verify
- Open https://mahmoudmosalm88.github.io/gymflow
- Confirm download buttons work for:
  - Mac (Apple Silicon)
  - Windows
