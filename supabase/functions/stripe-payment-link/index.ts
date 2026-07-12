import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function stripePost(path: string, params: URLSearchParams, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error on ${path}`);
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured. Run: supabase secrets set STRIPE_SECRET_KEY=sk_live_...');

    const { amount_cents, invoice_number, client_name } = await req.json();
    if (!amount_cents || amount_cents <= 0) throw new Error('amount_cents must be > 0');
    if (!invoice_number) throw new Error('invoice_number is required');

    // 1. Create product
    const prodParams = new URLSearchParams();
    prodParams.append('name', String(invoice_number));
    prodParams.append('description', `Invoice to ${client_name || 'client'}`);
    const product = await stripePost('/products', prodParams, key);

    // 2. Create price
    const priceParams = new URLSearchParams();
    priceParams.append('product', product.id);
    priceParams.append('unit_amount', String(Math.round(amount_cents)));
    priceParams.append('currency', 'usd');
    const price = await stripePost('/prices', priceParams, key);

    // 3. Create payment link
    const linkParams = new URLSearchParams();
    linkParams.append('line_items[0][price]', price.id);
    linkParams.append('line_items[0][quantity]', '1');
    const link = await stripePost('/payment_links', linkParams, key);

    return json({ url: link.url });
  } catch (err: any) {
    return json({ error: err.message }, 400);
  }
});
