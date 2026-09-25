// Vercel serverless function. Runs server-side only, so this is the one
// place the Anthropic API key can live safely (never sent to the browser).
// Set RECEIPT_SCAN_API_KEY in Vercel project settings -> Environment Variables.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RECEIPT_SCAN_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing RECEIPT_SCAN_API_KEY" });
    return;
  }

  const { image, mediaType, bucketNames } = req.body || {};
  if (!image || !mediaType) {
    res.status(400).json({ error: "Missing image" });
    return;
  }

  const bucketList = Array.isArray(bucketNames) && bucketNames.length
    ? bucketNames.join(", ")
    : "(none)";

  const prompt = `This is a photo of a shopping receipt. Read every line item and its price.

Available expense buckets: ${bucketList}

Reply with ONLY raw JSON (no markdown fences, no explanation), in exactly this shape:
{"store": "store name or null", "date": "YYYY-MM-DD or null", "items": [{"name": "item name", "price": 12.34, "suggestedBucket": "one of the bucket names above, or null if none fit"}]}

Rules:
- One entry per line item actually purchased. Skip subtotal/tax/total/discount lines.
- price is the final price for that line (after any line discount), as a plain number.
- If the receipt is blurry or a price is unreadable, make your best guess rather than omitting the item.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Anthropic API error", response.status, detail);
      res.status(502).json({ error: "Receipt scanning service failed" });
      return;
    }

    const data = await response.json();
    const raw = (data.content || []).map(block => block.text || "").join("").trim();
    const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Could not parse model output as JSON:", raw);
      res.status(502).json({ error: "Couldn't read this receipt. Try a clearer photo." });
      return;
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      res.status(502).json({ error: "No items found on this receipt. Try a clearer photo." });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected error scanning receipt" });
  }
};
