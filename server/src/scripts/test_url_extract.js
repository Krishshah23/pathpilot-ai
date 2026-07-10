import { extractUrlsFromText } from '../services/resumeText.service.js';

async function main() {
  const wrapped = `Project: Library Management System\nRepo: https://github.com/bhattyashwi/S\nystem`;
  const wrapped2 = `Project: Reflecto\nRepo: www.github.com/bhattyashwi14/Refl\no`;
  console.log('Input1:', wrapped);
  console.log('Extracted1:', extractUrlsFromText(wrapped));
  console.log('Input2:', wrapped2);
  console.log('Extracted2:', extractUrlsFromText(wrapped2));
}

main().catch((e) => { console.error(e); process.exit(1); });
