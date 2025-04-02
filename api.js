// Handles external API interactions, specifically fetching prices

const COINBASE_API_BASE = 'https://api.coinbase.com/v2/prices';

// Fetch current spot price from Coinbase API
export async function fetchCurrentPrice(crypto) {
  const url = `${COINBASE_API_BASE}/${crypto}-USD/spot`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Handle specific rate limit errors if needed
      if (response.status === 429) {
          console.warn(`Rate limited fetching ${crypto}. Trying again next interval.`);
          return null;
      }
      throw new Error(`HTTP error! status: ${response.status} for ${crypto}`);
    }
    const data = await response.json();
    if (data && data.data && data.data.amount) {
      return parseFloat(data.data.amount);
    } else {
      throw new Error(`Invalid API response format for ${crypto}`);
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${crypto}:`, error);
    return null; // Return null if fetch fails
  }
}