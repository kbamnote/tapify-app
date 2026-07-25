// Serialise an AI result into plain text for Copy / Share, based on the tool's
// render type. Kept separate from rendering so both stay simple.

export function resultToText(tool, result) {
  if (!result) return '';

  switch (tool.render) {
    case 'sections':
      return (tool.sections || [])
        .map((s) => `${s.label}:\n${(result[s.key] || '').toString().trim()}`)
        .filter((block) => block.split('\n').slice(1).join('').trim() !== '')
        .join('\n\n');

    case 'keywords':
      return (tool.groups || [])
        .map((g) => {
          const list = Array.isArray(result[g.key]) ? result[g.key] : [];
          if (!list.length) return '';
          return `${g.label}:\n${list.join(', ')}`;
        })
        .filter(Boolean)
        .join('\n\n');

    case 'list': {
      const list = Array.isArray(result[tool.listKey]) ? result[tool.listKey] : [];
      return list.map((item, i) => `${i + 1}. ${item}`).join('\n');
    }

    case 'faq': {
      const list = Array.isArray(result[tool.listKey]) ? result[tool.listKey] : [];
      return list.map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}`).join('\n\n');
    }

    case 'checklist': {
      const lines = [];
      if (typeof result.score === 'number') lines.push(`Profile Score: ${result.score}/100`);
      if (result.summary) lines.push(result.summary);
      lines.push('');
      (result.checklist || []).forEach((item) => {
        const mark = item.status === 'good' ? '✅' : item.status === 'missing' ? '❌' : '⚠️';
        lines.push(`${mark} [${(item.priority || '').toUpperCase()}] ${item.area}\n   ${item.suggestion || ''}`);
      });
      return lines.join('\n');
    }

    default:
      try {
        return JSON.stringify(result, null, 2);
      } catch (_) {
        return '';
      }
  }
}
