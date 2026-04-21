const fs = require('fs');
const path = require('path');
const file = path.join('c:', 'Ptojeto-jaco', 'Salao-secreto', 'src', 'pages', 'Agenda.jsx');
let content = fs.readFileSync(file, 'utf8');

// Colors replacement mapping for new client form
const replacements = [
  ['hover:bg-teal-50', 'hover:bg-sky-50'],
  ['text-teal-600', 'text-sky-600'],
  ['bg-teal-50', 'bg-sky-50'],
  ['border-teal-200', 'border-sky-200'],
  ['text-teal-400', 'text-sky-400'],
  ['focus:border-teal-400', 'focus:border-sky-400'],
  ['bg-teal-500', 'bg-sky-500'],
  ['hover:bg-teal-600', 'hover:bg-sky-600']
];

// Note: I will deliberately not replace the teal in PROF_COLORS because I want the professionals to have different colors within the blue/sky/cyan/indigo/slate/teal range. Let's do it carefully with regex.

for (const [search, replace] of replacements) {
  content = content.replace(new RegExp(search, 'g'), replace);
}

// But we don't want to break PROF_COLORS if it uses teal, let's revert it for PROF_COLORS just in case:
content = content.replace(
  "{ bg: 'bg-sky-500',     light: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',    hover: 'hover:bg-sky-50/60' },\n];",
  "{ bg: 'bg-teal-500',     light: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200',    hover: 'hover:bg-teal-50/60' },\n];"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Teal -> Sky update complete');
