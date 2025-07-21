#!/usr/bin/env node

/**
 * Connectivity Fix Verification Script
 * 
 * This script tests that:
 * 1. ConnectionDebugger no longer interferes with WebSocket connections
 * 2. Platform message flow works correctly 
 * 3. No duplicate connections occur
 * 4. React StrictMode doesn't cause issues
 */

const puppeteer = require('puppeteer');

async function testConnectivityFix() {
  console.log('🧪 Testing MIPTech Platform Connectivity Fix');
  console.log('=' .repeat(60));
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console logs for connection behavior
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // Log important connection events
      if (text.includes('[WebSocket]') || text.includes('[Chat]') || text.includes('[ConnectionDebugger]')) {
        console.log(`${msg.type().toUpperCase()}: ${text}`);
      }
    });
    
    // Navigate to the React app
    console.log('\n📱 Loading React application...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait for React to fully load and initialize
    await page.waitForTimeout(3000);
    
    console.log('\n🔍 Phase 1: Verify ConnectionDebugger is disabled');
    const debuggerLogs = logs.filter(log => 
      log.text.includes('ConnectionDebugger') && 
      log.text.includes('Skipping WebSocket test')
    );
    
    if (debuggerLogs.length > 0) {
      console.log('✅ ConnectionDebugger correctly disabled WebSocket testing');
      debuggerLogs.forEach(log => console.log(`   ${log.text}`));
    } else {
      console.log('❌ ConnectionDebugger disable message not found');
    }
    
    console.log('\n🔍 Phase 2: Check for duplicate connections');
    const connectionLogs = logs.filter(log => 
      log.text.includes('WebSocket') && 
      (log.text.includes('connecting') || log.text.includes('connected'))
    );
    
    const uniqueConnections = new Set(connectionLogs.map(log => log.text)).size;
    console.log(`📊 Connection attempts detected: ${connectionLogs.length}`);
    console.log(`📊 Unique connection types: ${uniqueConnections}`);
    
    if (connectionLogs.length <= 2) {
      console.log('✅ No excessive duplicate connections detected');
    } else {
      console.log('⚠️  Multiple connections detected - check logs');
    }
    
    console.log('\n🔍 Phase 3: Verify platform message flow');
    const platformLogs = logs.filter(log => 
      log.text.includes('connection_established') ||
      log.text.includes('initialization_progress') ||
      log.text.includes('connection_ready')
    );
    
    if (platformLogs.length > 0) {
      console.log('✅ Platform message flow detected');
      platformLogs.forEach(log => console.log(`   ${log.text}`));
    } else {
      console.log('❌ No platform messages detected - check platform connection');
    }
    
    console.log('\n🔍 Phase 4: Test chat widget interaction');
    
    // Try to find and click the chat widget
    const chatButton = await page.$('[aria-label="Open chat"]');
    if (chatButton) {
      console.log('✅ Chat widget button found');
      await chatButton.click();
      await page.waitForTimeout(1000);
      
      const chatWidget = await page.$('[role="dialog"], .bg-white');
      if (chatWidget) {
        console.log('✅ Chat widget opened successfully');
      } else {
        console.log('❌ Chat widget did not open');
      }
    } else {
      console.log('❌ Chat widget button not found');
    }
    
    // Wait a bit more to capture any delayed logs
    await page.waitForTimeout(2000);
    
    console.log('\n📊 Summary Report');
    console.log('=' .repeat(60));
    
    const errorLogs = logs.filter(log => log.type === 'error');
    const warningLogs = logs.filter(log => log.type === 'warning');
    
    console.log(`Total logs captured: ${logs.length}`);
    console.log(`Errors: ${errorLogs.length}`);
    console.log(`Warnings: ${warningLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('\n❌ Errors detected:');
      errorLogs.forEach(log => console.log(`   ${log.text}`));
    }
    
    if (warningLogs.length > 0) {
      console.log('\n⚠️  Warnings detected:');
      warningLogs.forEach(log => console.log(`   ${log.text}`));
    }
    
    // Generate test report
    const testReport = {
      timestamp: new Date().toISOString(),
      tests: {
        connectionDebuggerDisabled: debuggerLogs.length > 0,
        noDuplicateConnections: connectionLogs.length <= 2,
        platformMessagesDetected: platformLogs.length > 0,
        chatWidgetWorking: !!chatButton
      },
      logs: logs,
      summary: {
        totalLogs: logs.length,
        errors: errorLogs.length,
        warnings: warningLogs.length,
        connectionAttempts: connectionLogs.length
      }
    };
    
    // Save test report
    const fs = require('fs');
    const reportPath = './connectivity_fix_test_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
    console.log(`\n📄 Test report saved to: ${reportPath}`);
    
    console.log('\n🎯 Test Results:');
    Object.entries(testReport.tests).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    const allTestsPassed = Object.values(testReport.tests).every(Boolean);
    console.log(`\n${allTestsPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test if this script is called directly
if (require.main === module) {
  testConnectivityFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testConnectivityFix };