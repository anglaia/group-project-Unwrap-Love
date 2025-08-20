import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderAsync } from '@react-email/components';
import * as React from 'react';
import ShareLinkEmail from '@/emails/ShareLinkEmail';

// Initialize Resend with your API key
// IMPORTANT: Make sure to set a valid API key here or in your environment variables
// For testing, you can uncomment and use a hardcoded key (but remove before production)
// const resend = new Resend('re_your_actual_key_here');
const resend = new Resend(process.env.RESEND_API_KEY);

// Define the sender email address
// This must use a verified domain in Resend
const SENDER_EMAIL = 'hi@unwrap.love';

// Simple test function to verify Resend configuration
// You can call this separately if needed for testing
// Note: Not exported as it's not a valid Next.js route handler
function testResendConfig() {
  try {
    console.log("Testing Resend configuration with API key:", process.env.RESEND_API_KEY ? "API key is set" : "API key is missing");
    return resend.emails.send({
      from: `Unwrap Love <${SENDER_EMAIL}>`,
      to: 'huizha.com@gmail.com',  // 测试收件人
      subject: 'Resend Test',
      html: '<p>Resend configuration test successful!</p>',
    }).then(({ data, error }) => {
      if (error) {
        console.error('Test email error:', error);
        return { success: false, error };
      }

      console.log('Test email sent successfully:', data);
      return { success: true, data };
    }).catch(error => {
      console.error('Test email exception:', error);
      return { success: false, error };
    });
  } catch (error) {
    console.error('Test email general exception:', error);
    return Promise.reject(error);
  }
}

// Configure the unwrap.love domain (this should be executed once, typically during setup)
// You may want to move this to a separate setup script if this route is called frequently
async function configureDomain() {
  try {
    // Check if domain already exists before creating
    try {
      const { data: domains } = await resend.domains.list();

      let domainExists = false;
      let domainVerified = false;
      if (domains && Array.isArray(domains)) {
        for (const domain of domains) {
          if (domain.name === 'unwrap.love') {
            domainExists = true;
            domainVerified = domain.status === 'verified';
            console.log(`Domain unwrap.love exists, verification status: ${domain.status}`);
            break;
          }
        }
      }

      if (!domainExists) {
        const createResponse = await resend.domains.create({ name: 'unwrap.love' });
        console.log('Domain unwrap.love configuration response:', createResponse);
      } else if (!domainVerified) {
        console.log('⚠️ Domain unwrap.love exists but is not verified. Please verify it in the Resend dashboard.');
      } else {
        console.log('✅ Domain unwrap.love exists and is verified.');
      }
    } catch (apiError: any) {
      console.error('Resend API error:', apiError);
      // Log response details if available
      if (apiError.response) {
        try {
          console.error('Response status:', apiError.response.status);
          console.error('Response data:', await apiError.response.text());
        } catch (textError) {
          console.error('Could not read response text:', textError);
        }
      }
    }
  } catch (error) {
    console.error('General error configuring domain:', error);
  }
}

// We'll try to configure the domain, but continue even if it fails
// This prevents blocking the email sending functionality if domain setup fails
configureDomain().catch(error => {
  console.error('Domain configuration failed but continuing:', error);
});

// To test Resend configuration, uncomment this line
// testResendConfig();

// Valid Next.js Route Handler
export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body safely
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    const { shareUrl, senderName, recipientEmail, recipientName } = requestBody;

    // Validate required fields
    if (!shareUrl || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: shareUrl and recipientEmail are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create the email component with proper React element
    const emailComponent = React.createElement(ShareLinkEmail, {
      shareUrl,
      senderName: senderName || 'Your Friend',
      recipientName: recipientName || 'there',
    });

    // Render the email template to HTML
    const html = await renderAsync(emailComponent);

    // For a nicer sender name display
    const formattedFrom = `${senderName || 'Unwrap Love'} <${SENDER_EMAIL}>`;

    console.log('Attempting to send email to:', recipientEmail, 'from:', formattedFrom);
    console.log('API key status:', process.env.RESEND_API_KEY ? "API key is set" : "API key is missing");

    try {
      // Send the email using Resend
      const { data, error } = await resend.emails.send({
        from: formattedFrom,
        to: recipientEmail,
        subject: "Unwrap Your Gift",
        html,
      });

      if (error) {
        console.error('Resend API error during send:', error);
        return NextResponse.json(
          { error: 'Failed to send email: ' + (error.message || JSON.stringify(error)) },
          { status: 500 }
        );
      }

      console.log('Email sent successfully:', data);
      return NextResponse.json({
        success: true,
        data,
      });
    } catch (sendError: any) {
      console.error('Exception during email sending:', sendError);
      // Log more details if available
      if (sendError.response) {
        try {
          console.error('Response status:', sendError.response.status);
          console.error('Response data:', await sendError.response.text());
        } catch (textError) {
          console.error('Could not read response text:', textError);
        }
      }

      return NextResponse.json(
        { error: 'Failed to send email: ' + (sendError.message || 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in email API route:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}