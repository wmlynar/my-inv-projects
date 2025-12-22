#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="nowy-styl-ui"
APP_DIR="/home/admin/apps/nowy-styl-ui"

# Spróbuj znaleźć node
NODE_PATH="$(command -v node || echo /usr/bin/node)"

echo "Instaluję usługę ${SERVICE_NAME} dla aplikacji w ${APP_DIR}"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ Katalog ${APP_DIR} nie istnieje. Upewnij się, że projekt jest tam zainstalowany."
  exit 1
fi

echo "Użyję Node z: ${NODE_PATH}"

# (opcjonalnie) ustaw właściciela katalogu na konkretnego użytkownika, np. inovatica:
# sudo chown -R inovatica:inovatica "$APP_DIR"

# Tworzymy plik jednostki systemd
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Nowy Styl UI (Node.js frontend do RDS)
After=network.target

[Service]
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_PATH} server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
# Jeżeli chcesz, aby usługa działała jako konkretny użytkownik (np. inovatica), odkomentuj poniższe linie:
User=admin
Group=admin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "Przeładowuję konfigurację systemd..."
sudo systemctl daemon-reload

echo "Włączam usługę przy starcie systemu..."
sudo systemctl enable ${SERVICE_NAME}.service

echo "Uruchamiam usługę teraz..."
sudo systemctl restart ${SERVICE_NAME}.service

echo
echo "Status usługi:"
sudo systemctl status ${SERVICE_NAME}.service --no-pager
echo
echo "Logi na żywo możesz podglądać komendą:"
echo "  journalctl -u ${SERVICE_NAME}.service -f"
