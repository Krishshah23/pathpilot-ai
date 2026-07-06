/**
 * Dedicated service to analyze resumes for recruiter red flags.
 * Rule/heuristic-based analysis, separated from ML scoring models.
 */

export function detectRedFlags(rawText, parsedData) {
  const redFlags = [];
  const text = rawText || '';
  const experience = parsedData.experience || [];
  const education = parsedData.education || [];
  const projects = parsedData.projects || [];
  const contact = parsedData.contact || {};

  // 1. Missing Contact Info / LinkedIn / GitHub Links
  const missingProfiles = [];
  if (!contact.linkedin) missingProfiles.push('LinkedIn');
  if (!contact.github) missingProfiles.push('GitHub');

  if (missingProfiles.length > 0) {
    redFlags.push({
      key: 'missing_links',
      label: `Missing ${missingProfiles.join(' / ')} Link`,
      description: `Your resume is missing links to your professional profiles (${missingProfiles.join(', ')}).`,
      fix: 'Add links to your active LinkedIn and GitHub profiles in the header section.',
      severity: 'warning',
    });
  }

  if (!contact.email || !contact.phone) {
    const missing = [];
    if (!contact.email) missing.push('email');
    if (!contact.phone) missing.push('phone number');
    redFlags.push({
      key: 'missing_contact',
      label: `Missing Critical Contact Info`,
      description: `Your resume is missing basic contact information: ${missing.join(' and ')}.`,
      fix: 'Include a professional email address and working phone number at the top of your resume.',
      severity: 'critical',
    });
  }

  // 2. Generic / Templated Objective Statements
  const fillerPhrases = [
    'highly motivated self-starter',
    'looking for a challenging opportunity',
    'seeking a position to utilize my skills',
    'dynamic and detail-oriented',
    'passionate about leveraging my skills',
    'proven track record of success',
    'results-oriented professional',
    'seeking an entry-level position',
    'utilize my knowledge and skills',
  ];

  const headerText = text.slice(0, 1000).toLowerCase();
  const matchedFillers = fillerPhrases.filter((phrase) => headerText.includes(phrase));

  if (matchedFillers.length > 0) {
    redFlags.push({
      key: 'generic_objective',
      label: 'Generic / Cliché Objective Statement',
      description: `Your introduction contains standard buzzwords: "${matchedFillers[0]}". Recruiters prefer unique summaries.`,
      fix: 'Replace generic objectives with a professional summary highlighting 2-3 specific accomplishments and skills.',
      severity: 'warning',
    });
  }

  // 3. Bullet points with no quantifiable metrics
  // Parse bullet points from experience descriptions and projects
  const bulletLines = [];
  experience.forEach((exp) => {
    if (typeof exp === 'string') {
      bulletLines.push(...exp.split(/[•\n]/).map(line => line.trim()).filter(line => line.length > 15));
    }
  });
  projects.forEach((proj) => {
    if (proj && typeof proj.description === 'string') {
      bulletLines.push(...proj.description.split(/[•\n]/).map(line => line.trim()).filter(line => line.length > 15));
    }
  });

  if (bulletLines.length > 0) {
    // Check if line contains numbers, percentage, or currency signs
    const metricRegex = /\b\d+\b|%|\$|₹|percent/i;
    const linesWithMetrics = bulletLines.filter(line => metricRegex.test(line));
    const metricsRatio = linesWithMetrics.length / bulletLines.length;

    if (metricsRatio < 0.35) {
      redFlags.push({
        key: 'no_metrics',
        label: 'Lack of Quantifiable Metrics',
        description: `Only ${Math.round(metricsRatio * 100)}% of your experience/project descriptions contain numbers or percentages.`,
        fix: "Quantify your achievements (e.g., 'improved loading speed by 30%' or 'collaborated with a team of 4 developers').",
        severity: 'warning',
      });
    }
  }

  // 4. Inconsistent Date Formatting
  // Regexes for common date formats
  const monthYearRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/i;
  const slashDateRegex = /\b\d{1,2}\/\d{4}\b/;
  const yearOnlyRegex = /\b\d{4}\b/;

  let hasMonthYear = false;
  let hasSlashDate = false;
  let hasYearOnly = false;

  // Search in experience and education strings
  const dateSources = [...experience, ...education];
  dateSources.forEach((src) => {
    if (typeof src === 'string') {
      if (monthYearRegex.test(src)) hasMonthYear = true;
      if (slashDateRegex.test(src)) hasSlashDate = true;
      // check year only (but exclude if it matches monthYear or slashDate)
      const yearMatches = src.match(yearOnlyRegex);
      if (yearMatches && !monthYearRegex.test(src) && !slashDateRegex.test(src)) {
        hasYearOnly = true;
      }
    }
  });

  const formatsUsed = [hasMonthYear, hasSlashDate, hasYearOnly].filter(Boolean).length;
  if (formatsUsed > 1) {
    redFlags.push({
      key: 'inconsistent_dates',
      label: 'Inconsistent Date Formatting',
      description: 'Multiple date formats detected (e.g., using both Month YYYY and MM/YYYY).',
      fix: 'Standardize all dates to one format (e.g. always write "June 2023" or "06/2023").',
      severity: 'warning',
    });
  }

  // 5. Unexplained Date Gaps
  // Find all 4-digit years between 2000 and current year + 1
  const currentYear = new Date().getFullYear();
  const allYears = [];
  const yearRegexGlobal = /\b(20[0-2][0-9])\b/g;
  let match;
  
  // Extract years from experience and education strings
  dateSources.forEach((src) => {
    if (typeof src === 'string') {
      while ((match = yearRegexGlobal.exec(src)) !== null) {
        const year = parseInt(match[1], 10);
        if (year >= 2000 && year <= currentYear + 1) {
          allYears.push(year);
        }
      }
    }
  });

  const uniqueYears = [...new Set(allYears)].sort((a, b) => a - b);
  
  if (uniqueYears.length >= 2) {
    let largestGap = 0;
    let gapStart = 0;
    let gapEnd = 0;
    
    for (let i = 0; i < uniqueYears.length - 1; i++) {
      const gap = uniqueYears[i + 1] - uniqueYears[i];
      if (gap > largestGap) {
        largestGap = gap;
        gapStart = uniqueYears[i];
        gapEnd = uniqueYears[i + 1];
      }
    }

    // A gap of 3 or more years is flagged as unexplained gap
    if (largestGap >= 3) {
      redFlags.push({
        key: 'unexplained_gap',
        label: 'Potential Unexplained Gap',
        description: `No activity or credentials listed between years ${gapStart} and ${gapEnd}.`,
        fix: 'Add a line explaining this gap (e.g., freelance work, training bootcamp, or personal projects).',
        severity: 'warning',
      });
    }
  }

  return redFlags;
}
