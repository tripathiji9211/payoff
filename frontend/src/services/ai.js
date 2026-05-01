const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

export const AI_MODELS = {
    CLAUDE: "claude-3-5-sonnet-20240620", // Using a known valid model ID if the one requested is not available yet, but the user asked for claude-sonnet-4-20250514
    DEMO: "claude-sonnet-4-20250514"
};

const FRAUD_SYSTEM_PROMPT = `You are a fraud detection AI for an offline payment system. 
Analyze this transaction and return JSON only:
{ 
  "riskScore": 0-100, 
  "riskLevel": "LOW"|"MEDIUM"|"HIGH", 
  "flags": string[], 
  "recommendation": "ACCEPT"|"REVIEW"|"REJECT",
  "reason": "short explanation" 
}`;

const AMOUNT_SUGGESTION_SYSTEM_PROMPT = `You are a financial assistant for OfflinePay. 
Analyze the user's transaction history and suggest 3 common payment amounts they might want to send.
Return JSON only: { "suggestions": number[] }`;

const EXPLANATION_SYSTEM_PROMPT = `Explain why an offline payment token might have been rejected in simple terms for a non-technical user.
Keep it friendly and reassuring. Max 2 sentences.`;

/**
 * Local rule-based fraud detection for offline fallback
 */
const localFraudCheck = (context) => {
    const { amount, tokenAge, isNewReceiver } = context;
    const flags = [];
    let riskScore = 10;
    let riskLevel = 'LOW';
    let recommendation = 'ACCEPT';

    // Amount > user's daily average (simulated as 1000) * 3
    if (amount > 3000) {
        flags.push("High transaction value");
        riskScore += 30;
    }

    // Token age > 8 minutes
    if (tokenAge > 8 * 60 * 1000) {
        flags.push("Token expired/old");
        riskScore += 40;
    }

    // New receiver + high amount
    if (isNewReceiver && amount > 1500) {
        flags.push("Unusual transfer to new receiver");
        riskScore += 30;
    }

    if (riskScore >= 70) {
        riskLevel = 'HIGH';
        recommendation = 'REJECT';
    } else if (riskScore >= 40) {
        riskLevel = 'MEDIUM';
        recommendation = 'REVIEW';
    }

    return {
        riskScore,
        riskLevel,
        flags,
        recommendation,
        reason: flags.length > 0 ? flags.join(", ") : "Normal activity pattern",
        isLocal: true
    };
};

export const detectFraud = async (context, isOnline) => {
    if (!isOnline || !API_KEY) {
        // Fallback to local logic
        return localFraudCheck(context);
    }

    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "dangerously-allow-browser": "true" // Note: In production, this should be handled via a proxy server
            },
            body: JSON.stringify({
                model: AI_MODELS.DEMO,
                max_tokens: 1000,
                system: FRAUD_SYSTEM_PROMPT,
                messages: [{ role: "user", content: JSON.stringify(context) }]
            })
        });

        const data = await response.json();
        const content = data.content[0].text;
        return JSON.parse(content);
    } catch (error) {
        console.error("AI Fraud Check Failed:", error);
        return localFraudCheck(context);
    }
};

export const getAmountSuggestions = async (history, isOnline) => {
    if (!isOnline || !API_KEY || history.length === 0) {
        // Default suggestions if offline or no history
        return { suggestions: [100, 500, 1000], isLocal: true };
    }

    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "dangerously-allow-browser": "true"
            },
            body: JSON.stringify({
                model: AI_MODELS.DEMO,
                max_tokens: 1000,
                system: AMOUNT_SUGGESTION_SYSTEM_PROMPT,
                messages: [{ role: "user", content: JSON.stringify(history) }]
            })
        });

        const data = await response.json();
        return JSON.parse(data.content[0].text);
    } catch (error) {
        return { suggestions: [100, 500, 1000], isLocal: true };
    }
};

export const getRejectionExplanation = async (errorContext, isOnline) => {
    if (!isOnline || !API_KEY) {
        return { 
            text: "This payment could not be processed because the offline token is no longer valid or has already been used.",
            isLocal: true 
        };
    }

    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "dangerously-allow-browser": "true"
            },
            body: JSON.stringify({
                model: AI_MODELS.DEMO,
                max_tokens: 1000,
                system: EXPLANATION_SYSTEM_PROMPT,
                messages: [{ role: "user", content: JSON.stringify(errorContext) }]
            })
        });

        const data = await response.json();
        return { text: data.content[0].text, isLocal: false };
    } catch (error) {
        return { 
            text: "The security system detected an issue with this transaction's digital signature. Please try generating a new QR code.",
            isLocal: true 
        };
    }
};
