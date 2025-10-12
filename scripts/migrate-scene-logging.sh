#!/bin/bash
# Migrate scene files from logger.xxx() to context.log()

SCENES=(
  "scenes/examples/dev/advanced_chart.js"
  "scenes/examples/dev/config-validator-demo.js"
  "scenes/examples/dev/draw_api.js"
  "scenes/examples/dev/draw_api_animated.js"
  "scenes/examples/dev/graphics-engine-demo.js"
  "scenes/examples/dev/power_price.js"
  "scenes/examples/dev/startup-static.js"
  "scenes/examples/dev/template.js"
)

for scene in "${SCENES[@]}"; do
  echo "Migrating $scene..."
  
  # Add 'log' to context destructuring if not already present
  # This handles patterns like: const { device, ... } = context;
  perl -i -pe 's/^(\s*const\s+\{)([^}]+)(\}\s*=\s*context;)/$1$2, log$3/g unless \/\blog\b\/' "$scene"
  
  # Convert logger.debug() to log?.(..., 'debug')
  perl -i -pe 's/logger\.debug\(([^)]+)\);?/log?.($1, '\''debug'\'');/g' "$scene"
  
  # Convert logger.info() and logger.ok() to log?.(..., 'info')
  perl -i -pe 's/logger\.(info|ok)\(([^)]+)\);?/log?.($2, '\''info'\'');/g' "$scene"
  
  # Convert logger.warn() to log?.(..., 'warning')
  perl -i -pe 's/logger\.warn\(([^)]+)\);?/log?.($1, '\''warning'\'');/g' "$scene"
  
  # Convert logger.error() to log?.(..., 'error')
  perl -i -pe 's/logger\.error\(([^)]+)\);?/log?.($1, '\''error'\'');/g' "$scene"
  
  echo "  ✓ Done"
done

echo ""
echo "✅ Migration complete! Running audit..."
node scripts/audit-scene-logging.js

