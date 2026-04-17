#!/usr/bin/env bash

APP_SUBTREES=(
  "apps/web|app-web|https://github.com/moritzbrantner/next-template.git|main"
  "apps/mobile|app-mobile|https://github.com/moritzbrantner/expo-template.git|main"
  "apps/desktop|app-desktop|https://github.com/moritzbrantner/electron-template.git|main"
)

PACKAGE_SUBTREES=(
  # Add package subtree mappings here when a package has its own upstream remote.
  # Example:
  # "packages/ui|package-ui|https://github.com/moritzbrantner/platform-packages.git|main"
)
