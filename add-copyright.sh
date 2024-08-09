#!/bin/bash

HEADER_TEXT='Copyright (c) 2024 Discover Financial Services'
HEADER_SHELL="# $HEADER_TEXT"
HEADER_PYTHON='"""
'"$HEADER_TEXT"'
"""'
HEADER_GO="// $HEADER_TEXT"
HEADER_JS_TS="/**
 * $HEADER_TEXT
*/"
LINES_TO_GREP=5

# Find all relevant files, excluding node_modules and .git directories
for file in $(find . -type f \( -name "*.sh" -o -name "*.py" -o -name "*.go" -o -name "*.ts" -o -name "*.js" -o -executable \) ! -path "*/node_modules/*" ! -path "*/.git/*"); do
  if ! head -n $LINES_TO_GREP "$file" | grep -iq "$HEADER_TEXT"; then

    first_line=$(head -n 1 "$file")
    if [[ $file == *.sh ]]; then
      HEADER="$HEADER_SHELL"
    elif [[ $file == *.py ]]; then
      HEADER="$HEADER_PYTHON"
    elif [[ $file == *.go ]]; then
      HEADER="$HEADER_GO"
    elif [[ $file == *.ts || $file == *.js ]]; then
      HEADER="$HEADER_JS_TS"
    else
      HEADER="$HEADER_SHELL"  # Default header for other executable files
    fi

    if [[ $first_line == "#!"* ]]; then
      awk -v header="$HEADER" 'NR==1 {print; print header; next} {print}' "$file" > tmp && mv tmp "$file"
    else
      awk -v header="$HEADER" 'BEGIN {print header} {print}' "$file" > tmp && mv tmp "$file"
    fi

    if [ $? -ne 0 ]; then
      echo "Error adding header to $file"
    else
      echo "Added header to $file"
    fi
  fi
done
