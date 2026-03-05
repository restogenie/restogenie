import axios from 'axios';

export async function sendSystemAlert(message: string, context?: any) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Log locally regardless
    console.error(`🚨 SYSTEM ALERT: ${message}`, context || "");

    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL is not configured. Alert not sent to Slack/KaKao.");
        return;
    }

    try {
        await axios.post(webhookUrl, {
            text: `*[RestoGenie System Error]*\n${message}\n\`\`\`${JSON.stringify(context || {}, null, 2)}\`\`\``
        });
    } catch (e) {
        console.error("Failed to send remote alert:", e);
    }
}
