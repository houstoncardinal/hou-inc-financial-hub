export interface ScannedReceipt {
  amount: string;
  date: string;
  merchant: string;
  category: string;
  notes: string;
}

export async function scanReceipt(imageDataUrl: string): Promise<ScannedReceipt> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');

  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageDataUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: `Extract receipt data. Respond with ONLY a raw JSON object — no markdown, no explanation.

{
  "amount": "0.00",
  "date": "YYYY-MM-DD",
  "merchant": "Business Name",
  "category": "Category",
  "notes": "Brief description"
}

Rules:
- amount: total as decimal string, no $ or commas
- date: ISO YYYY-MM-DD; use ${today} if not legible
- merchant: business/store name only
- category: best match from — Materials & Supplies, Labor & Subcontractors, Equipment Rental, Transportation & Freight, Office & Admin, Insurance, Utilities, Professional Services, Travel & Meals, Software & Subscriptions, Maintenance & Repairs, Miscellaneous
- notes: one short sentence describing the purchase

If not a receipt, return: {"error":"not_a_receipt"}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json() as any;
  const text = ((data.choices?.[0]?.message?.content || '') as string).trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse AI response');

  const parsed = JSON.parse(match[0]) as any;
  if (parsed.error) throw new Error('Image does not appear to be a receipt');

  return {
    amount:   String(parsed.amount   || ''),
    date:     String(parsed.date     || today),
    merchant: String(parsed.merchant || ''),
    category: String(parsed.category || ''),
    notes:    String(parsed.notes    || ''),
  };
}
