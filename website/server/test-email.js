#!/usr/bin/env node
/**
 * Email Service Tester
 * Usage: node test-email.js
 */

require('./config/loadEnv');
const {
  sendOTPEmail,
  initializeTransporter,
  getEmailConfigStatus,
} = require('./utils/emailService');

async function testEmail() {
  console.log('\n' + '='.repeat(60));
  console.log('Email Service Tester');
  console.log('='.repeat(60) + '\n');

  console.log('1. Checking configuration...');
  const configStatus = getEmailConfigStatus();

  if (!configStatus.ready) {
    console.log('   Email service is not ready:', configStatus.message);
    console.log('   Update server/.env with real email credentials.');
    console.log('   For Gmail, use your full Gmail address and an app password.\n');
    return;
  }

  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail');
  console.log('   EMAIL_PASSWORD: ***');

  console.log('\n2. Initializing email service...');
  const transporter = initializeTransporter();
  if (!transporter) {
    console.log('   Email transporter could not be initialized.\n');
    return;
  }
  console.log('   Email transporter initialized');

  console.log('\n3. Verifying email connection...');
  try {
    await transporter.verify();
    console.log('   Email connection verified successfully');
  } catch (err) {
    console.log('   Email connection failed:', err.message);
    console.log('\n   Possible causes:');
    console.log('   - Wrong email or app password');
    console.log('   - Gmail 2FA not enabled');
    console.log('   - App password not generated correctly');
    console.log('   - Firewall or network blocking SMTP\n');
    return;
  }

  console.log('\n4. Sending test OTP email...');
  const testOTP = '123456';
  const testAddress = process.env.EMAIL_USER;

  try {
    const result = await sendOTPEmail(testAddress, testOTP, 'Test User');
    if (!result.success) {
      console.log('   Email send failed:', result.message);
      return;
    }

    console.log('   Email sent successfully');
    console.log('   Check your inbox for OTP:', testOTP);
    console.log('   To:', testAddress);
    console.log('   Subject: AgriTechPro Password Reset OTP');
  } catch (err) {
    console.log('   Error sending email:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Email Service Test Complete');
  console.log('='.repeat(60) + '\n');
}

testEmail().catch((err) => {
  console.error('Test Error:', err.message);
  process.exit(1);
});
