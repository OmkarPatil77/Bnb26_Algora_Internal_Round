/**
 * Line highlighting heuristics for Python misconceptions.
 * Returns 1-indexed line numbers in the submitted code.
 */
export function getHighlightedLines(code: string, misconceptionId?: string): number[] {
  if (!code || !misconceptionId) return [];

  const lines = code.split("\n");
  const highlighted: number[] = [];

  switch (misconceptionId.toUpperCase()) {
    case "M01":
    case "M02": {
      // Look for range(...) call
      lines.forEach((line, idx) => {
        if (/range\s*\(/.test(line)) {
          highlighted.push(idx + 1);
        }
      });
      break;
    }
    case "M03": {
      // Look for print(...) call
      lines.forEach((line, idx) => {
        if (/print\s*\(/.test(line)) {
          highlighted.push(idx + 1);
        }
      });
      break;
    }
    case "M04": {
      // Look for list aliasing assignment (e.g. b = a, alias = colors) or .append(
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/^\w+\s*=\s*\w+$/.test(trimmed) || /\.append\s*\(/.test(trimmed)) {
          highlighted.push(idx + 1);
        }
      });
      break;
    }
    case "M05": {
      // Look for floor division (//) or division (/)
      lines.forEach((line, idx) => {
        if (/\/\/|\//.test(line)) {
          highlighted.push(idx + 1);
        }
      });
      break;
    }
    case "M06": {
      // Look for accumulator initialization inside loop (e.g. total = 0 inside indented block of for/while)
      let insideLoop = false;
      let loopIndent = 0;

      lines.forEach((line, idx) => {
        const indentMatch = line.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;
        const trimmed = line.trim();

        if (/^(for|while)\b/.test(trimmed)) {
          insideLoop = true;
          loopIndent = currentIndent;
        } else if (insideLoop) {
          if (trimmed.length > 0 && currentIndent <= loopIndent) {
            // Exited loop body
            insideLoop = false;
          } else if (/^\w+\s*=\s*0(\.0)?$/.test(trimmed)) {
            // Reinitializing inside loop
            highlighted.push(idx + 1);
          }
        }
      });
      break;
    }
    case "M07": {
      // Look for input(...) call without int()/float() conversion
      lines.forEach((line, idx) => {
        if (/input\s*\(/.test(line)) {
          highlighted.push(idx + 1);
        }
      });
      break;
    }
  }

  return highlighted;
}
