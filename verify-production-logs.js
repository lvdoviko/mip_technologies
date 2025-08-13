// Script to verify production console output
const puppeteer = require('puppeteer');

async function verifyProductionLogs() {
    console.log('🔍 Starting production console log verification...\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Collect all console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text()
        });
    });
    
    // Navigate to the production build
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    // Wait for app to initialize
    await page.waitForTimeout(3000);
    
    // Click chat widget to trigger initialization
    const chatButton = await page.$('[aria-label*="chat" i], button[class*="chat" i]');
    if (chatButton) {
        await chatButton.click();
        await page.waitForTimeout(2000);
    }
    
    // Analyze logs for sensitive data
    const sensitivePatterns = [
        { name: 'Session ID', pattern: /session_\d+_[a-z0-9]+/i },
        { name: 'Visitor ID', pattern: /visitor_\d+_[a-z0-9]+/i },
        { name: 'UUID', pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i },
        { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/ },
        { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9-_]+/i },
        { name: 'API Key', pattern: /api[_-]?key[:\s]+[\w-]+/i },
        { name: 'X-API-Key', pattern: /X-API-Key[:\s]+[\w-]+/i },
        { name: 'Tenant ID (raw)', pattern: /tenant[_-]?id[:\s]+[\w-]+/i },
        { name: 'Debug/Info logs', pattern: /🔍|📝|✅|📁|⏱️/ }
    ];
    
    console.log('📊 Console Log Analysis Results:');
    console.log('================================\n');
    
    // Count log types
    const logTypeCounts = {};
    consoleLogs.forEach(log => {
        logTypeCounts[log.type] = (logTypeCounts[log.type] || 0) + 1;
    });
    
    console.log('Log Type Summary:');
    Object.entries(logTypeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
    console.log();
    
    // Check for sensitive data
    let issuesFound = false;
    console.log('Sensitive Data Check:');
    
    sensitivePatterns.forEach(({ name, pattern }) => {
        const matches = consoleLogs.filter(log => pattern.test(log.text));
        if (matches.length > 0) {
            issuesFound = true;
            console.log(`  ❌ ${name}: Found ${matches.length} instance(s)`);
            matches.slice(0, 2).forEach(match => {
                console.log(`     Example: "${match.text.substring(0, 100)}..."`);
            });
        }
    });
    
    if (!issuesFound) {
        console.log('  ✅ No sensitive data detected in production logs');
    }
    
    console.log('\n================================');
    
    // Show all console output for manual review
    if (consoleLogs.length > 0) {
        console.log('\nAll Console Output (first 20 lines):');
        consoleLogs.slice(0, 20).forEach((log, i) => {
            console.log(`  ${i + 1}. [${log.type}] ${log.text.substring(0, 150)}`);
        });
        
        if (consoleLogs.length > 20) {
            console.log(`  ... and ${consoleLogs.length - 20} more lines`);
        }
    } else {
        console.log('\n✅ No console output detected (production is clean!)');
    }
    
    await browser.close();
    
    // Final verdict
    console.log('\n📋 Final Verdict:');
    if (issuesFound) {
        console.log('❌ FAILED: Sensitive data or debug logs found in production');
        process.exit(1);
    } else if (consoleLogs.filter(l => l.type === 'error').length > 0) {
        console.log('⚠️  WARNING: Errors detected in production (but no sensitive data)');
    } else {
        console.log('✅ PASSED: Production console is clean!');
    }
}

// Run the verification
verifyProductionLogs().catch(console.error);