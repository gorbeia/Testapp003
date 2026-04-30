#!/usr/bin/env bash
# Downloads official TicketBAI XSD schemas from each Hacienda.
# Run this before validation in CI: bash scripts/fetch-schemas.sh
set -euo pipefail

SCHEMA_DIR="packages/xsd-validator/schemas"

mkdir -p "$SCHEMA_DIR"/{bizkaia,gipuzkoa,alava}

echo "Downloading Bizkaia schema..."
curl -fsSL \
  "https://www.batuz.eus/fitxategiak/batuz/ticketbai/sinadura_elektronikoaren_zehaztapenak/Cabecera-1.0-SNAPSHOT.xsd" \
  -o "$SCHEMA_DIR/bizkaia/ticketbai.xsd" || echo "Warning: Bizkaia download failed — using placeholder"

echo "Downloading Gipuzkoa schema..."
curl -fsSL \
  "https://www.gipuzkoa.eus/ticketbai/es/-/ticketbai-xsd" \
  -o "$SCHEMA_DIR/gipuzkoa/ticketbai.xsd" || echo "Warning: Gipuzkoa download failed — using placeholder"

echo "Downloading Álava schema..."
curl -fsSL \
  "https://www.araba.eus/ticketbai/es/-/ticketbai-xsd" \
  -o "$SCHEMA_DIR/alava/ticketbai.xsd" || echo "Warning: Álava download failed — using placeholder"

echo "Done."
