#!/usr/bin/env bash
# cloc-plus.sh - Count lines of code with proper exclusions
# Separates source code from documentation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to format number with dots as thousands separator
format_number() {
    local num="$1"
    # Use printf or rev+sed approach for portability
    # This works on both GNU and BSD versions
    echo "$num" | rev | sed 's/\([0-9]\{3\}\)/\1./g' | sed 's/\.$//' | rev
}

# Function to extract total from cloc output
extract_total() {
    local output="$1"
    echo "$output" | grep "^SUM:" | awk '{print $5}'
}

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PIDICON Code Statistics${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Run cloc for SOURCE CODE only (excludes root bmad/ framework, not docs/bmad/)
echo -e "${YELLOW}Analyzing source code...${NC}"
SOURCE_OUTPUT=$(cloc . \
  --exclude-dir=node_modules,coverage,bmad,docs,playwright-report,test-results,data,.devenv,.direnv \
  --exclude-ext=lock,md \
  --fullpath --not-match-d='(web/public)' \
  2>&1 | grep -v "Wrote /" || true)

echo "$SOURCE_OUTPUT"
echo ""

# Extract source code total
SOURCE_TOTAL=$(extract_total "$SOURCE_OUTPUT")
if [ -n "$SOURCE_TOTAL" ] && [ "$SOURCE_TOTAL" -gt 0 ]; then
    FORMATTED_SOURCE=$(format_number "$SOURCE_TOTAL")
    echo -e "${GREEN}📊 Source Code Total: ${FORMATTED_SOURCE} lines${NC}"
else
    echo -e "${GREEN}📊 Source Code Total: 0 lines${NC}"
fi

echo ""
echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
echo ""

# Run cloc for DOCUMENTATION only (including docs/bmad/ project docs)
echo -e "${YELLOW}Analyzing documentation...${NC}"
DOC_OUTPUT=$(cloc docs \
  2>/dev/null || true)

echo "$DOC_OUTPUT"
echo ""

# Extract documentation total
DOC_TOTAL=$(extract_total "$DOC_OUTPUT")
if [ -n "$DOC_TOTAL" ] && [ "$DOC_TOTAL" -gt 0 ]; then
    FORMATTED_DOC=$(format_number "$DOC_TOTAL")
    echo -e "${GREEN}📝 Documentation Total: ${FORMATTED_DOC} lines${NC}"
else
    echo -e "${GREEN}📝 Documentation Total: 0 lines${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

# Calculate grand total
if [ -n "$SOURCE_TOTAL" ] && [ -n "$DOC_TOTAL" ]; then
    GRAND_TOTAL=$((SOURCE_TOTAL + DOC_TOTAL))
    FORMATTED_GRAND=$(format_number "$GRAND_TOTAL")
    echo -e "${GREEN}🎯 Grand Total: ${FORMATTED_GRAND} lines${NC}"
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

