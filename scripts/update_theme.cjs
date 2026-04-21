const fs = require('fs');
const path = require('path');
const file = path.join('c:', 'Ptojeto-jaco', 'Salao-secreto', 'src', 'pages', 'Agenda.jsx');
let content = fs.readFileSync(file, 'utf8');

// Colors replacement mapping
const replacements = [
  // Background
  ['from-slate-50 via-white to-indigo-50/30', 'from-slate-50 via-blue-50/10 to-blue-100/30'],
  
  // Typography
  ['text-indigo-400', 'text-blue-500'],
  ['text-indigo-600', 'text-blue-600'],
  ['bg-indigo-100', 'bg-blue-100'],
  ['hover:bg-indigo-200', 'hover:bg-blue-200'],
  ['hover:text-indigo-600', 'hover:text-blue-600'],
  ['from-slate-800 to-slate-600', 'from-blue-950 to-slate-600'],

  // Focus & borders
  ['focus:ring-indigo-400/50', 'focus:ring-blue-400/50'],
  ['focus:border-indigo-400', 'focus:border-blue-400'],
  ['hover:bg-indigo-50', 'hover:bg-blue-50'],
  ['hover:border-indigo-200', 'hover:border-blue-200'],

  // Buttons
  ['from-indigo-500 to-teal-500', 'from-blue-600 to-sky-500'],
  ['shadow-indigo-200', 'shadow-blue-200/50'],
  ['from-indigo-600 to-teal-500', 'from-blue-600 to-sky-500'],
  ['hover:from-indigo-700 hover:to-teal-600', 'hover:from-blue-700 hover:to-sky-600'],
  ['bg-indigo-600 border-indigo-600', 'bg-blue-600 border-blue-600'],

  // Loader
  ['border-indigo-400', 'border-blue-500'],

  // Empty state & PlusIcon
  ['text-indigo-200', 'text-blue-200'],

  // Shadows and table UI
  ['shadow-sm overflow-x-auto', 'shadow-2xl shadow-blue-900/5 overflow-x-auto ring-1 ring-slate-200'],
  ['rounded-2xl overflow-hidden', 'rounded-3xl overflow-hidden'],
  
  // Modal background
  ['bg-white h-full shadow-2xl', 'bg-white/95 backdrop-blur-xl h-full shadow-2xl border-l border-slate-100'],

  // Professional colors array replacement
  [
    `const PROF_COLORS = [
  { bg: 'bg-indigo-500',   light: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-200',  hover: 'hover:bg-indigo-50/60' },
  { bg: 'bg-teal-500',     light: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200',    hover: 'hover:bg-teal-50/60' },
  { bg: 'bg-amber-500',    light: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',   hover: 'hover:bg-amber-50/60' },
  { bg: 'bg-rose-500',     light: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',    hover: 'hover:bg-rose-50/60' },
  { bg: 'bg-violet-500',   light: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200',  hover: 'hover:bg-violet-50/60' },
  { bg: 'bg-cyan-500',     light: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200',    hover: 'hover:bg-cyan-50/60' },
];`,
    `const PROF_COLORS = [
  { bg: 'bg-blue-500',     light: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200',    hover: 'hover:bg-blue-50/60' },
  { bg: 'bg-sky-500',      light: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200',     hover: 'hover:bg-sky-50/60' },
  { bg: 'bg-indigo-500',   light: 'bg-indigo-50',   text: 'text-indigo-700',   border: 'border-indigo-200',  hover: 'hover:bg-indigo-50/60' },
  { bg: 'bg-cyan-500',     light: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200',    hover: 'hover:bg-cyan-50/60' },
  { bg: 'bg-slate-500',    light: 'bg-slate-50',    text: 'text-slate-700',    border: 'border-slate-200',   hover: 'hover:bg-slate-50/60' },
  { bg: 'bg-teal-500',     light: 'bg-teal-50',     text: 'text-teal-700',     border: 'border-teal-200',    hover: 'hover:bg-teal-50/60' },
];`
  ]
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Update complete');
