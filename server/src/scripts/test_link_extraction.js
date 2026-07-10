;(async () => {
	const m = await import('../services/resumeText.service.js');
	const extractUrlsFromText = m.extractUrlsFromText;

	const sample = `Contact\nhttps://www.linkedin.com/in/someone\nmoretext\nPortfolio: www.example.com/port\nfolio\nBroken: github.com/some\nname/repo\n`;

	console.log('Sample text:');
	console.log(sample);
	console.log('Extracted URLs:');
	console.log(extractUrlsFromText(sample));
})();
