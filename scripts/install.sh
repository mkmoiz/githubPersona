#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname -- "$SCRIPT_DIR")"
BIN_DIR="${HOME}/.local/bin"
APP_DIR="${HOME}/.local/share/applications"

mkdir -p "$BIN_DIR" "$APP_DIR"

# 1. Create CLI launcher in ~/.local/bin/gitpersona
cat <<EOF > "${BIN_DIR}/gitpersona"
#!/usr/bin/env bash
exec "${PROJECT_DIR}/scripts/start-ui.sh" "\$@"
EOF
chmod +x "${BIN_DIR}/gitpersona"

# 2. Create desktop application launcher
cat <<EOF > "${APP_DIR}/gitpersona.desktop"
[Desktop Entry]
Name=GitPersona
Comment=Local Git Identity & Account Hub
Exec=${BIN_DIR}/gitpersona
Icon=${PROJECT_DIR}/static/favicon.svg
Terminal=false
Type=Application
Categories=Development;RevisionControl;
EOF
chmod +x "${APP_DIR}/gitpersona.desktop"

echo "Installed successfully!"
echo "- CLI Command: ${BIN_DIR}/gitpersona"
echo "- Desktop Entry: ${APP_DIR}/gitpersona.desktop"
echo "You can now run 'gitpersona' directly from your terminal."
