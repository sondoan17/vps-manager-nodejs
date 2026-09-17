#!/usr/bin/env bash
# Shared Gate-5 normalization: remove full-line and inline explanatory comments
# while preserving # characters inside single/double quoted values.
normalize_content() {
  awk '
  {
    line = $0
    out = ""
    sq = 0
    dq = 0
    for (i = 1; i <= length(line); i++) {
      c = substr(line, i, 1)
      prev = (i > 1 ? substr(line, i - 1, 1) : "")
      if (c == "\x27" && !dq) { sq = !sq; out = out c; continue }
      if (c == "\"" && !sq) { dq = !dq; out = out c; continue }
      if (c == "#" && !sq && !dq && (i == 1 || prev == " " || prev == "\t")) break
      out = out c
    }
    print out
  }'
}
