#!/bin/bash
cd "$(dirname "$0")"
exec /Users/victor/.asdf/installs/bun/1.3.10/bin/bun src/server.ts
