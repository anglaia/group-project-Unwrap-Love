import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with the API key
const resend = new Resend('re_9rCAemRo_Lj3oP6sWDYoTNshctoseuq9o');

// 处理GET请求
export async function GET(request: Request) {
    // 获取URL中的查询参数
    const url = new URL(request.url);
    const emailTo = url.searchParams.get('email') || 'test@example.com';

    return sendTestEmail(emailTo);
}

// 处理POST请求
export async function POST(request: Request) {
    try {
        const data = await request.json();
        const emailTo = data.email || 'test@example.com';

        return sendTestEmail(emailTo);
    } catch (error) {
        console.error('Error in POST request:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}

// 发送测试邮件的功能
async function sendTestEmail(emailTo: string) {
    try {
        console.log(`Test email endpoint called - sending to ${emailTo}`);

        // 发送测试邮件
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: [emailTo],
            subject: 'Test Email from Unwrap',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>This is a test email</h2>
                    <p>This email was sent at: ${new Date().toLocaleString()}</p>
                    <p>If you received this email, the Resend integration is working correctly.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Test email error:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to send test email', details: error },
                { status: 500 }
            );
        }

        console.log('Test email sent successfully:', data);
        return NextResponse.json({
            success: true,
            message: `Test email sent successfully to ${emailTo}`,
            data
        });
    } catch (error) {
        console.error('Unexpected error in test email:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
} 