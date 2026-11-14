const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4174';
module.exports = {
  ci: {
    collect: {
      url: [base + '/', base + '/ai-adoption.html'],
      numberOfRuns: 3,
      settings: {
        onlyCategories: ['performance'],
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
        throttlingMethod: 'simulate',
        throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
        chromeFlags: '--headless --no-sandbox'
      }
    },
    assert: {
      assertions: {
        'total-byte-weight': ['error', { maxNumericValue: 2000000, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }]
      }
    },
    upload: { target: 'filesystem', outputDir: `output/lighthouse/${process.env.AUDIT_LABEL || 'after'}` }
  }
};
